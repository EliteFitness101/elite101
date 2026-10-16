import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors={"Access-Control-Allow-Origin":"https://elite.resofit.fit","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:cors});
const text=(v:unknown,m:number)=>typeof v==="string"?v.trim().slice(0,m):"";
async function sha(v:string){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("")}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({ok:false,message:"POST required"},405);
 let applicationId:string|null=null; let chatb2kAccepted=false;
 try{
  const b=await req.json(); if(text(b.website,40))return json({ok:true,message:"Application received."});
  const full_name=text(b.full_name,100),email=text(b.email,255).toLowerCase(),phone=text(b.phone,25),age=Number(b.age);
  const country=text(b.country,80)||"Nigeria",state=text(b.state,80)||null,city=text(b.city,80);
  const bigo_username=text(b.bigo_username,80)||null,bigo_uid=text(b.bigo_uid,80)||null,tiktok=text(b.tiktok,80)||null,instagram=text(b.instagram,80)||null;
  const experience=text(b.experience,2000)||null,availability=text(b.availability,500)||null,languages=text(b.languages,300)||null,device=text(b.device,200)||null;
  const content_category=text(b.content_category,200)||null,source_channel=text(b.source_channel,100)||"elite.resofit.fit";
  const internet_ready=b.internet_ready===true,whatsapp_opt_in=b.whatsapp_opt_in===true;
  const countryTier=["Nigeria","Ghana","Kenya","South Africa","Tanzania","Uganda"].includes(country)?"A":["Rwanda","Zambia","Zimbabwe","Cameroon","Sierra Leone","Liberia"].includes(country)?"B":"C";
  if(full_name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||phone.length<7||!Number.isInteger(age)||age<18||age>80||city.length<2||b.consent_age!==true||b.consent_identity!==true||b.consent_terms!==true)return json({ok:false,message:"Please complete all required eligibility and consent fields."},400);
  const ip=(req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim(),ipHash=await sha(ip),ua=text(req.headers.get("user-agent"),500),since=new Date(Date.now()-3600000).toISOString();
  const {count}=await db.from("elite_host_applications").select("id",{count:"exact",head:true}).eq("ip_hash",ipHash).gte("created_at",since);
  if((count??0)>=5)return json({ok:false,message:"Too many applications from this connection. Please try again later."},429);
  const {data:existing}=await db.from("elite_host_applications").select("id,status").eq("email",email).in("status",["pending","reviewing","audition","verified","accepted"]).limit(1).maybeSingle();
  if(existing)return json({ok:false,message:"An active application already exists for this email."},409);
  const reference_number="ELITE-"+crypto.randomUUID().replaceAll("-","").slice(0,12).toUpperCase();
  const {data:app,error:ae}=await db.from("applications").insert({full_name,email,phone,age,location:[city,state,country].filter(Boolean).join(", "),prior_experience:experience,notes:JSON.stringify({bigo_username,bigo_uid,tiktok,instagram,availability,languages,device,content_category,internet_ready,whatsapp_opt_in}),stage:"new",program:"Elite NG Live Host",cohort:"BIGO Live",reference_number,source:"elite.resofit.fit",campaign:"elite_live_host_recruitment",attribution:{pathway:"live_host",first_platform:"BIGO Live",source_channel},tags:["elite","live_host","bigo","recruitment"],status:"pending"}).select("id").single(); if(ae)throw ae; applicationId=app.id;
  const {data:v,error:ve}=await db.from("candidate_verifications").insert({application_id:app.id,verification_type:"phone",provider:"elite_review",status:"pending",metadata:{pathway:"elite_live_host",platform:"BIGO Live",next_step:"phone_otp"}}).select("id").single(); if(ve)throw ve;
  const {error:ce}=await db.from("verification_consents").insert({application_id:app.id,purpose:"identity",consent_text_version:"elite-live-host-v1",consent_method:"web",ip_hash:ipHash,user_agent_hash:await sha(ua)}); if(ce)throw ce;
  const {data:ea,error:ee}=await db.from("elite_host_applications").insert({application_id:app.id,full_name,email,phone,age,country,state,city,bigo_username,bigo_uid,tiktok,instagram,experience,availability,languages,device,content_category,internet_ready,whatsapp_opt_in,source_channel,country_tier:countryTier,consent_age:true,consent_identity:true,consent_terms:true,status:"pending",verification_status:"pending",source:"elite.resofit.fit",campaign:"elite_live_host_recruitment",ip_hash:ipHash,user_agent:ua,metadata:{pathway:"live_host",first_platform:"BIGO Live",application_reference:reference_number,verification_id:v.id,consent_version:"elite-live-host-v1",next_step:"phone_otp"}}).select("id").single(); if(ee)throw ee;
  // ChatB2K dynamic talent intelligence is additive: application acceptance remains successful if enrichment or messaging is temporarily unavailable.
  try {
   const engineUrl=Deno.env.get("SUPABASE_URL")+"/functions/v1/chatb2k-talent-intelligence";
   const engineKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
   const engineResponse=await fetch(engineUrl,{method:"POST",headers:{"Content-Type":"application/json","apikey":engineKey,"Authorization":"Bearer "+engineKey},body:JSON.stringify({profile_type:"host",source_id:ea.id,profile:{display_name:full_name,email,phone,whatsapp_opt_in,timezone:text(b.timezone,100),preferred_language:text(b.preferred_language,40),preferred_channels:["whatsapp","telegram"],career_choices:[content_category||"BIGO Live hosting"],goals:[text(b.personal_goal,500),text(b.dream_goal,500)].filter(Boolean),bio:experience,social_review_consent:b.social_review_consent===true,social_profiles:[{platform:"BIGO Live",handle:bigo_username||"",url:text(b.bigo_profile_url,1000)},{platform:"TikTok",handle:tiktok||"",url:text(b.tiktok_url,1000)},{platform:"Instagram",handle:instagram||"",url:text(b.instagram_url,1000)}].filter(x=>x.handle||x.url)}})});
   if(!engineResponse.ok)console.error("ChatB2K talent enrichment queued/failed",engineResponse.status,await engineResponse.text().catch(()=> ""));
  }catch(engineError){console.error("ChatB2K talent enrichment unavailable; application preserved",engineError);}
  return json({ok:true,application_id:ea.id,reference:reference_number,message:"Application received.",chatb2k_status:chatb2kAccepted?"accepted_for_processing":"retry_required"});
 }catch(e){if(applicationId){await db.from("verification_consents").delete().eq("application_id",applicationId);await db.from("candidate_verifications").delete().eq("application_id",applicationId);await db.from("elite_host_applications").delete().eq("application_id",applicationId);await db.from("applications").delete().eq("id",applicationId);} console.error("elite-host-apply error",e);return json({ok:false,message:"Application could not be submitted."},500);}
});