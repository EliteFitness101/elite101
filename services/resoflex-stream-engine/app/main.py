import asyncio, hashlib, hmac, json, logging, os, shutil, signal, subprocess, tempfile, time
from pathlib import Path
from typing import Any
import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

logging.basicConfig(level=os.getenv("LOG_LEVEL","INFO"))
log=logging.getLogger("resoflex-stream")
app=FastAPI(title="ResoFlex Stream Engine", version="1.0.0")
SUPABASE_URL=os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_ROLE_KEY=os.environ["SUPABASE_SERVICE_ROLE_KEY"]
WEBHOOK_SECRET=os.environ["STREAM_WEBHOOK_SECRET"]
TELEGRAM_RTMP_URL=os.getenv("TELEGRAM_RTMP_URL","rtmps://dc4-1.rtmp.t.me/s/")
TELEGRAM_STREAM_KEY=os.getenv("TELEGRAM_STREAM_KEY","")
BUCKET=os.getenv("ASSET_BUCKET","resoflex-assets")
PREFIX=os.getenv("ASSET_PREFIX","processed")
DATA=Path(os.getenv("DATA_DIR","/data/assets"))
POLL_SECONDS=int(os.getenv("POLL_SECONDS","8"))
MAX_ASSETS=int(os.getenv("MAX_ASSETS","100"))
proc: subprocess.Popen | None=None
active_job: str | None=None
stop_event=asyncio.Event()
client=httpx.AsyncClient(timeout=45)

class Trigger(BaseModel):
    action: str = Field(default="start", pattern="^(start|stop|restart|health)$")
    schedule_id: str | None = None
    idempotency_key: str = Field(min_length=12, max_length=128)
    requested_by: str | None = None

def headers():
    return {"apikey":SUPABASE_SERVICE_ROLE_KEY,"Authorization":f"Bearer {SUPABASE_SERVICE_ROLE_KEY}","Content-Type":"application/json"}

async def rpc(name:str,payload:dict):
    r=await client.post(f"{SUPABASE_URL}/rest/v1/rpc/{name}",headers=headers(),json=payload)
    r.raise_for_status()
    return r.json()

async def storage_list():
    r=await client.post(f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET}",headers=headers(),json={"prefix":PREFIX,"limit":MAX_ASSETS,"sortBy":{"column":"name","order":"asc"}})
    r.raise_for_status()
    return [x for x in r.json() if x.get("name") and not x.get("id") is None]

async def download_assets():
    DATA.mkdir(parents=True,exist_ok=True)
    entries=await storage_list()
    videos=[]
    for item in entries:
        name=item["name"]
        if not name.lower().endswith((".mp4",".mov",".m4v",".mkv",".webm")): continue
        key=f"{PREFIX}/{name}"
        target=DATA/(hashlib.sha256(key.encode()).hexdigest()+Path(name).suffix.lower())
        if not target.exists() or target.stat().st_size==0:
            r=await client.post(f"{SUPABASE_URL}/storage/v1/object/sign/{BUCKET}/{key}",headers=headers(),json={"expiresIn":3600})
            r.raise_for_status()
            signed=r.json().get("signedURL") or r.json().get("signedUrl")
            if not signed: raise RuntimeError("Storage signed URL was not returned")
            url=signed if signed.startswith("http") else SUPABASE_URL+"/storage/v1"+signed
            async with client.stream("GET",url,timeout=None) as response:
                response.raise_for_status()
                with target.open("wb") as f:
                    async for chunk in response.aiter_bytes(): f.write(chunk)
        if target.stat().st_size: videos.append(target)
    return videos

def stop_process():
    global proc,active_job
    if proc and proc.poll() is None:
        proc.send_signal(signal.SIGTERM)
        try: proc.wait(timeout=15)
        except subprocess.TimeoutExpired: proc.kill(); proc.wait(timeout=5)
    proc=None
    active_job=None

async def set_session(job_id:str,status:str,detail:dict|None=None):
    await rpc("resoflex_stream_update_session",{"p_job_id":job_id,"p_status":status,"p_detail":detail or {}})

async def run_broadcast(job_id:str):
    global proc,active_job
    if not TELEGRAM_STREAM_KEY: raise RuntimeError("TELEGRAM_STREAM_KEY is not configured")
    if not shutil.which("ffmpeg"): raise RuntimeError("ffmpeg executable missing")
    files=await download_assets()
    if not files: raise RuntimeError(f"No playable video assets found in {BUCKET}/{PREFIX}/")
    playlist=DATA/"active-playlist.txt"
    playlist.write_text("".join("file '"+str(p).replace("'","'\\''")+"'\n" for p in files))
    target=TELEGRAM_RTMP_URL.rstrip("/")+"/"+TELEGRAM_STREAM_KEY
    cmd=["ffmpeg","-hide_banner","-loglevel","warning","-re","-stream_loop","-1","-f","concat","-safe","0","-i",str(playlist),"-c:v","libx264","-preset","veryfast","-tune","zerolatency","-pix_fmt","yuv420p","-r","30","-g","60","-b:v","2500k","-maxrate","2500k","-bufsize","5000k","-c:a","aac","-b:a","128k","-ar","44100","-f","flv",target]
    active_job=job_id
    proc=subprocess.Popen(cmd,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
    await set_session(job_id,"running",{"asset_count":len(files),"pid":proc.pid})
    while proc.poll() is None and not stop_event.is_set():
        await asyncio.sleep(5)
    rc=proc.poll()
    if rc is None:
        stop_process()
        await set_session(job_id,"stopped",{"reason":"worker_shutdown"})
    else:
        proc=None; active_job=None
        await set_session(job_id,"failed",{"exit_code":rc,"reason":"ffmpeg_exited"})
        raise RuntimeError(f"FFmpeg exited with code {rc}")

async def worker_loop():
    while not stop_event.is_set():
        try:
            if proc is None or proc.poll() is not None:
                job=await rpc("resoflex_stream_claim_job",{"p_worker_id":os.getenv("WORKER_ID","elite101-stream-worker")})
                if isinstance(job,list): job=job[0] if job else None
                if job and job.get("id"):
                    try: await run_broadcast(job["id"])
                    except Exception as e:
                        log.exception("Broadcast job failed")
                        try: await set_session(job["id"],"failed",{"error":str(e)[:500]})
                        except Exception: log.exception("Could not persist failure")
        except Exception: log.exception("Queue poll failed")
        await asyncio.sleep(POLL_SECONDS)

@app.on_event("startup")
async def startup():
    DATA.mkdir(parents=True,exist_ok=True)
    app.state.worker=asyncio.create_task(worker_loop())

@app.on_event("shutdown")
async def shutdown():
    stop_event.set()
    stop_process()
    task=getattr(app.state,"worker",None)
    if task: task.cancel()
    await client.aclose()

@app.get("/health")
async def health():
    return {"ok":True,"service":"resoflex-stream-engine","worker_id":os.getenv("WORKER_ID","elite101-stream-worker"),"broadcasting":bool(proc and proc.poll() is None),"active_job":active_job}

@app.post("/control")
async def control(body:Trigger, authorization:str|None=Header(default=None)):
    expected="Bearer "+WEBHOOK_SECRET
    if not authorization or not hmac.compare_digest(authorization,expected):
        raise HTTPException(status_code=401,detail="Unauthorized")
    if body.action=="health": return await health()
    if body.action in ("stop","restart"):
        if active_job:
            try: await set_session(active_job,"stopping",{"requested_by":body.requested_by})
            except Exception: log.exception("Could not persist stop request")
        stop_process()
        if body.action=="stop": return {"accepted":True,"action":"stop"}
    result=await rpc("resoflex_stream_enqueue_job",{"p_schedule_id":body.schedule_id,"p_idempotency_key":body.idempotency_key,"p_requested_by":body.requested_by})
    return {"accepted":True,"job":result}
