import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";

const offers: Record<string, { name: string; usd: number; interval: "once" | "monthly"; description: string }> = {
  "highlight-launch-pack": { name: "Highlight Launch Pack", usd: 49, interval: "once", description: "One-time editing and delivery package." },
  "creator-starter": { name: "Starter", usd: 9, interval: "monthly", description: "Creator workspace subscription, billed monthly." },
  "creator-pro": { name: "Pro", usd: 19, interval: "monthly", description: "Expanded creator workflow, billed monthly." },
  "agency-workspace": { name: "Agency Workspace", usd: 99, interval: "monthly", description: "Multi-creator team workspace, billed monthly." },
  "agency-production-retainer": { name: "Agency Production", usd: 300, interval: "monthly", description: "Managed monthly production retainer." },
};

type CheckoutStatus = { status: string; offer_name: string; amount_ngn: number; currency: string; billing_interval: string; paid_at?: string | null };

export default function EliteCheckout() {
  const [params] = useSearchParams();
  const slug = params.get("offer") ?? "";
  const offer = offers[slug];
  const returnedReference = params.get("reference") ?? params.get("trxref") ?? "";
  const isReturn = params.get("payment") === "return" && Boolean(returnedReference);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [prepared, setPrepared] = useState<{ authorization_url: string; reference: string; amount_ngn: number; fx_source_updated_at: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<CheckoutStatus | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (!isReturn || !returnedReference) return;
    let active = true;
    let attempts = 0;
    const check = async () => {
      if (!active) return;
      setCheckingStatus(true);
      const { data, error: invokeError } = await supabase.functions.invoke("elite-media-checkout-status", { body: { reference: returnedReference } });
      if (!active) return;
      if (!invokeError && data && typeof data.status === "string") setPaymentStatus(data as CheckoutStatus);
      attempts += 1;
      if (attempts >= 10 || (data?.status && !["pending"].includes(data.status))) {
        window.clearInterval(timer);
        setCheckingStatus(false);
      }
    };
    const timer = window.setInterval(check, 2500);
    void check();
    return () => { active = false; window.clearInterval(timer); };
  }, [isReturn, returnedReference]);

  const currency = useMemo(() => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }), []);
  async function prepareCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPrepared(null);
    setBusy(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("elite-media-checkout", {
        body: { offer_slug: slug, name: name.trim(), email: email.trim(), phone: phone.trim() },
      });
      if (invokeError || !data?.authorization_url || !data?.reference || !Number.isFinite(Number(data?.amount_ngn))) {
        throw new Error(data?.error || invokeError?.message || "Checkout could not be prepared. Please try again.");
      }
      setPrepared({
        authorization_url: data.authorization_url,
        reference: data.reference,
        amount_ngn: Number(data.amount_ngn),
        fx_source_updated_at: String(data.fx_source_updated_at ?? ""),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout could not be prepared.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="elite-page min-h-screen overflow-hidden text-white">
      <Navbar />
      <div className="elite-atmosphere" aria-hidden="true"><span /><span /><span /></div>
      <div className="relative z-10 mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1fr_0.8fr] md:py-16">
        <section className="pt-2">
          <Link to="/monetization" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to offers</Link>
          <p className="elite-kicker mt-10">ELITE NG · SECURE CHECKOUT</p>
          {isReturn ? (
            <div className="mt-6 max-w-xl">
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Payment status</h1>
              <p className="mt-4 text-sm leading-7 text-white/60">Your return from Paystack is not by itself proof of payment. We confirm payment from the verified payment event.</p>
              <div className="elite-glass mt-7 rounded-3xl p-6">
                {paymentStatus?.status === "paid" || paymentStatus?.status === "active" ? <><CheckCircle2 className="h-8 w-8 text-[#e9c979]" /><h2 className="mt-4 text-xl font-semibold">Payment confirmed</h2><p className="mt-2 text-sm text-white/60">{paymentStatus.offer_name} · {currency.format(paymentStatus.amount_ngn)} {paymentStatus.billing_interval === "monthly" ? "per month" : "one time"}.</p>{paymentStatus.billing_interval === "monthly" && <Link to="/manage-subscription" className="mt-4 inline-flex items-center gap-2 text-sm text-[#f4d58b]">Manage or cancel subscription <ArrowRight className="h-4 w-4" /></Link>}</> : <><LoaderCircle className="h-8 w-8 animate-spin text-[#e9c979]" /><h2 className="mt-4 text-xl font-semibold">{paymentStatus?.status === "failed" ? "Payment was not completed" : "Confirming your payment"}</h2><p className="mt-2 text-sm leading-6 text-white/60">{checkingStatus ? "Waiting for the verified Paystack confirmation…" : "The payment is not yet confirmed. If you completed payment, wait briefly and refresh this page."}</p>{paymentStatus?.status === "pending" && <p className="mt-3 text-xs text-white/40">Reference: {returnedReference}</p>}</>}
                <p className="mt-5 break-all text-xs text-white/40">Payment reference: {returnedReference}</p>
                <Link to="/monetization" className="mt-6 inline-flex items-center gap-2 text-sm text-[#f4d58b]">Return to offers <ArrowRight className="h-4 w-4" /></Link>
              </div>
            </div>
          ) : offer ? (
            <>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-6xl">Complete your order.</h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/60">Enter your billing details. We’ll calculate the current NGN amount on the server and show it before you continue to Paystack. No payment is taken until you authorize it there.</p>
              <div className="elite-glass mt-8 max-w-xl rounded-3xl p-6 sm:p-8">
                <div className="flex items-start gap-3"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#e9c979]" /><p className="text-sm leading-6 text-white/65">Only submit media you own or are authorized to process. Monthly plans renew automatically until cancelled; review the exact NGN amount before authorizing recurring billing.</p></div>
                {!prepared ? (
                  <form className="mt-7 space-y-4" onSubmit={prepareCheckout}>
                    <label className="block text-sm text-white/70">Full name<input required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={e => setName(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-[#e9c979]" /></label>
                    <label className="block text-sm text-white/70">Email address<input required type="email" maxLength={255} autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-[#e9c979]" /></label>
                    <label className="block text-sm text-white/70">Phone number<input required type="tel" minLength={7} maxLength={32} autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-white outline-none focus:border-[#e9c979]" /></label>
                    {offer.interval === "monthly" && <label className="flex items-start gap-3 text-xs leading-5 text-white/55"><input required type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 accent-[#e9c979]" /><span>I understand this is a recurring monthly subscription and authorize the monthly charge shown on the next step until I cancel.</span></label>}
                    {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm text-red-200">{error}</p>}
                    <button disabled={busy || (offer.interval === "monthly" && !confirmed)} type="submit" className="elite-cta flex h-12 w-full items-center justify-center rounded-full font-semibold disabled:cursor-not-allowed disabled:opacity-50">{busy ? <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Preparing checkout…</> : <>Calculate secure payment <ArrowRight className="ml-2 h-4 w-4" /></>}</button>
                  </form>
                ) : (
                  <div className="mt-7">
                    <p className="text-sm text-white/55">Exact amount to authorize</p>
                    <p className="mt-2 text-4xl font-semibold text-[#f4d58b]">{currency.format(prepared.amount_ngn)}<span className="ml-2 text-sm font-normal text-white/50">{offer.interval === "monthly" ? "/ month" : "one time"}</span></p>
                    <p className="mt-3 text-xs leading-5 text-white/45">The NGN amount is based on a timestamped FX quote. {prepared.fx_source_updated_at ? `Quote updated ${new Date(prepared.fx_source_updated_at).toLocaleString()}. ` : ""}{offer.interval === "monthly" ? "This fixed NGN amount is used for future monthly renewals unless the subscription is changed or cancelled." : "This is a one-time charge."}</p>
                    <button onClick={() => window.location.assign(prepared.authorization_url)} className="elite-cta mt-6 flex h-12 w-full items-center justify-center rounded-full font-semibold">Continue to Paystack <ArrowRight className="ml-2 h-4 w-4" /></button>
                    <button onClick={() => setPrepared(null)} className="mt-4 w-full text-sm text-white/45 hover:text-white">Change details</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-6"><h1 className="text-4xl font-semibold">Choose an offer first.</h1><p className="mt-4 text-white/60">Select an Elite NG offer to start secure checkout.</p><Link to="/monetization" className="elite-cta mt-7 inline-flex h-12 items-center rounded-full px-6 font-semibold">View offers <ArrowRight className="ml-2 h-4 w-4" /></Link></div>
          )}
        </section>
        <aside className="elite-glass h-fit rounded-3xl p-6 sm:p-8 md:mt-24">
          <p className="elite-kicker">ORDER SUMMARY</p>
          {offer ? <><h2 className="mt-4 text-2xl font-semibold">{offer.name}</h2><p className="mt-3 text-sm leading-6 text-white/55">{offer.description}</p><div className="my-6 h-px bg-white/10" /><div className="flex items-baseline justify-between gap-4"><span className="text-sm text-white/55">Listed price</span><span className="text-xl font-semibold text-[#f4d58b]">${offer.usd}{offer.interval === "monthly" ? "/mo" : ""}</span></div><p className="mt-3 text-xs leading-5 text-white/40">USD is the listed reference price. Paystack will charge in NGN; the exact amount is calculated at checkout and displayed before you authorize payment.</p><p className="mt-6 text-xs text-white/40">Reference: {prepared?.reference ?? "Created securely after you submit your details"}</p></> : <p className="mt-4 text-sm text-white/55">Payment status and order details will appear here.</p>}
        </aside>
      </div>
    </main>
  );
}
