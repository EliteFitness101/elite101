import { createClient } from "npm:@supabase/supabase-js@2";
const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const origins=new Set(["https://elite.resofit.fit","https://elite101.vercel.app"]);
Deno.serve(async(req:Request)=>{
 const reqOrigin=(req.headers.get("origin")??"").replace(/\/$/,"");
 const origin=origins.has(reqOrigin)?reqOrigin:"https://elite.resofit.fit";
 const headers={"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers});
 try{
  const body=await req.json();const reference=String(body?.reference??"").trim();
  if(!/^ELITE-[A-Z0-9-]{12,80}$/i.test(reference))return new Response(JSON.stringify({error:"invalid_reference"}),{status:400,headers});
  const {data,error}=await admin.from("elite_media_checkouts").select("status,offer_name,amount_ngn,billing_interval,paid_at,updated_at").eq("reference",reference).maybeSingle();
  if(error)throw error;if(!data)return new Response(JSON.stringify({error:"checkout_not_found"}),{status:404,headers});
  return new Response(JSON.stringify({status:data.status,offer_name:data.offer_name,amount_ngn:data.amount_ngn,currency:"NGN",billing_interval:data.billing_interval,paid_at:data.paid_at,updated_at:data.updated_at}),{status:200,headers});
 }catch(e){console.error("elite-media-checkout-status",String(e));return new Response(JSON.stringify({error:"status_unavailable"}),{status:500,headers});}
});