import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";

export default function EliteManageSubscription() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [manageUrl, setManageUrl] = useState("");
  const [offerName, setOfferName] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setManageUrl("");
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("elite-media-manage-subscription", {
        body: { reference: reference.trim(), email: email.trim().toLowerCase() },
      });
      if (invokeError || !data?.manage_url) throw new Error(data?.error || invokeError?.message || "Subscription management is temporarily unavailable.");
      setOfferName(String(data.offer_name ?? "Elite subscription"));
      setManageUrl(String(data.manage_url));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not retrieve the management link.");
    } finally { setBusy(false); }
  }
  return (
    <main className="elite-page min-h-screen overflow-hidden text-white">
      <Navbar />
      <div className="elite-atmosphere" aria-hidden="true"><span /><span /><span /></div>
      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-16">
        <Link to="/monetization" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to offers</Link>
        <p className="elite-kicker mt-10">ELITE NG · SUBSCRIPTION MANAGEMENT</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">Manage your plan.</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60">Enter the email used at checkout and your Elite payment reference. We’ll request a secure Paystack management link so you can review or cancel recurring billing with the payment provider.</p>
        <section className="elite-glass mt-8 rounded-3xl p-6 sm:p-8">
          <div className="flex gap-3"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#e9c979]" /><p className="text-sm leading-6 text-white/60">Your reference is shown on your checkout return page and payment receipt. One-time purchases do not have a recurring subscription to manage.</p></div>
          <form className="mt-7 space-y-4" onSubmit={submit}>
            <label className="block text-sm text-white/70">Payment reference<input required value={reference} onChange={e => setReference(e.target.value)} placeholder="ELITE-…" maxLength={100} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-[#e9c979]" /></label>
            <label className="block text-sm text-white/70">Checkout email<input required type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" maxLength={255} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-[#e9c979]" /></label>
            {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
            <button disabled={busy} type="submit" className="elite-cta flex h-12 w-full items-center justify-center rounded-full font-semibold disabled:opacity-50">{busy ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Retrieving secure link…</> : <>Get subscription management link <ArrowRight className="ml-2 h-4 w-4" /></>}</button>
          </form>
          {manageUrl && <div className="mt-6 rounded-2xl border border-[#e9c979]/25 bg-black/20 p-5"><p className="text-sm font-semibold text-[#f4d58b]">{offerName}</p><p className="mt-2 text-sm leading-6 text-white/60">Paystack will open its secure subscription-management page. Review the status and confirm any cancellation there.</p><a href={manageUrl} rel="noreferrer" className="elite-cta mt-5 inline-flex h-12 w-full items-center justify-center rounded-full font-semibold">Open Paystack management <ArrowRight className="ml-2 h-4 w-4" /></a></div>}
        </section>
      </div>
    </main>
  );
}
