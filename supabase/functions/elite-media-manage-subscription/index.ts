import { createClient } from "npm:@supabase/supabase-js@2";
const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const key=Deno.env.get("PAYSTACK_SECRET_KEY")??"";
const origins=new Set(["https://elite.resofit.fit","https://elite101.vercel.app"]);
Deno.serve(async(req:Request)=>{
 const requestOrigin=(req.headers.get("origin")??"").replace(/\/$/,"");
 const origin=origins.has(requestOrigin)?requestOrigin:"https://elite.resofit.fit";
 const headers={"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":origin,"Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers});
 if(!key.startsWith("sk_live_"))return new Response(JSON.stringify({error:"live_subscription_management_unavailable"}),{status:503,headers});
 try{
  const body=await req.json();const reference=String(body?.reference??"").trim();const email=String(body?.email??"").trim().toLowerCase();
  if(!/^ELITE-[A-Z0-9-]{12,80}$/i.test(reference)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return new Response(JSON.stringify({error:"valid_reference_and_email_required"}),{status:400,headers});
  const {data:checkout,error}=await admin.from("elite_media_checkouts").select("reference,email,offer_name,billing_interval,paystack_subscription_code,status").eq("reference",reference).eq("email",email).maybeSingle();
  if(error)throw error;if(!checkout)return new Response(JSON.stringify({error:"subscription_not_found_for_details"}),{status:404,headers});
  if(checkout.billing_interval!=="monthly")return new Response(JSON.stringify({error:"this_order_has_no_recurring_subscription"}),{status:409,headers});
  if(!checkout.paystack_subscription_code)return new Response(JSON.stringify({error:"subscription_setup_pending_retry_shortly"}),{status:409,headers});
  const response=await fetch(`https://api.paystack.co/subscription/${encodeURIComponent(checkout.paystack_subscription_code)}/manage/link/`,{headers:{Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(12000)});
  const payload=await response.json().catch(()=>null);
  if(!response.ok||!payload?.status||!payload?.data?.link)throw new Error("paystack_manage_link_failed");
  return new Response(JSON.stringify({ok:true,manage_url:payload.data.link,offer_name:checkout.offer_name,status:checkout.status}),{status:200,headers});
 }catch(e){console.error("elite subscription management failed",String(e));return new Response(JSON.stringify({error:"subscription_management_unavailable"}),{status:502,headers});}
});