import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowDownRight, ArrowRight, Bot, Check, ChevronDown,
  Coins, CreditCard, Film, Globe2, LoaderCircle, MonitorPlay, RadioTower,
  ShieldCheck, Sparkles, WandSparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const pathways = [
  { tag: "CREATE", title: "Creator media studio", copy: "Turn approved footage into a clear, repeatable short-form workflow.", video: "/Creating_advertisement_for_creators_20261017004820.mp4", fallback: "/Creator_filming_travel_content_20261017005213.mp4", icon: Film, cta: "Explore media", to: "/monetization" },
  { tag: "CONNECT", title: "Talent & brand discovery", copy: "Find creator profiles, campaign opportunities, and the next useful connection.", video: "/Creator_applying_for_streaming_role_20261017010020.mp4", fallback: "/Creator_applying_for_streaming_role_20261017010020.mp4", icon: Globe2, cta: "Browse talent", to: "/marketplace" },
  { tag: "GO LIVE", title: "BIGO host pathway", copy: "Explore the host application path and the information needed to get started.", video: "/Livestream_host_recruitment_video_20261017005535.mp4", fallback: "/Creator_filming_travel_content_20261017005213.mp4", icon: RadioTower, cta: "Explore live", to: "/questionnaire" },
  { tag: "OPERATE", title: "Agency workspace", copy: "Organize creator assets, requests, publishing handoffs, and team workflows.", video: "/Creators_preparing_for_professional_content_20261017003431.mp4", fallback: "/Creator_filming_travel_content_20261017005213.mp4", icon: MonitorPlay, cta: "View plans", to: "/monetization" },
];

const countries = [
  { name: "Nigeria", code: "NG", currency: "NGN" },
  { name: "United States", code: "US", currency: "USD" },
  { name: "United Kingdom", code: "GB", currency: "GBP" },
  { name: "Germany", code: "DE", currency: "EUR" },
  { name: "France", code: "FR", currency: "EUR" },
  { name: "Ireland", code: "IE", currency: "EUR" },
  { name: "Spain", code: "ES", currency: "EUR" },
  { name: "Italy", code: "IT", currency: "EUR" },
  { name: "Netherlands", code: "NL", currency: "EUR" },
  { name: "Euro area (other)", code: "EU", currency: "EUR" },
  { name: "Canada", code: "CA", currency: "CAD" },
  { name: "Australia", code: "AU", currency: "AUD" },
  { name: "New Zealand", code: "NZ", currency: "NZD" },
  { name: "Ghana", code: "GH", currency: "GHS" },
  { name: "South Africa", code: "ZA", currency: "ZAR" },
  { name: "Kenya", code: "KE", currency: "KES" },
  { name: "Uganda", code: "UG", currency: "UGX" },
  { name: "Tanzania", code: "TZ", currency: "TZS" },
  { name: "Rwanda", code: "RW", currency: "RWF" },
  { name: "Egypt", code: "EG", currency: "EGP" },
  { name: "India", code: "IN", currency: "INR" },
  { name: "Singapore", code: "SG", currency: "SGD" },
  { name: "Malaysia", code: "MY", currency: "MYR" },
  { name: "Philippines", code: "PH", currency: "PHP" },
  { name: "Indonesia", code: "ID", currency: "IDR" },
  { name: "Japan", code: "JP", currency: "JPY" },
  { name: "Brazil", code: "BR", currency: "BRL" },
  { name: "Mexico", code: "MX", currency: "MXN" },
  { name: "Switzerland", code: "CH", currency: "CHF" },
  { name: "Norway", code: "NO", currency: "NOK" },
  { name: "Sweden", code: "SE", currency: "SEK" },
  { name: "Denmark", code: "DK", currency: "DKK" },
  { name: "Poland", code: "PL", currency: "PLN" },
  { name: "Turkey", code: "TR", currency: "TRY" },
  { name: "United Arab Emirates", code: "AE", currency: "AED" },
  { name: "Saudi Arabia", code: "SA", currency: "SAR" },
  { name: "Other / choose currency", code: "OTHER", currency: "" },
];
const currencies = ["NGN", "USD", "GBP", "EUR", "CAD", "AUD", "NZD", "GHS", "ZAR", "KES", "UGX", "TZS", "RWF", "EGP", "INR", "SGD", "MYR", "PHP", "IDR", "JPY", "BRL", "MXN", "CHF", "NOK", "SEK", "DKK", "PLN", "TRY", "AED", "SAR", "USDT", "BTC", "ETH"];
const rails = [
  { value: "card", label: "Card / local checkout", detail: "Available methods and final currency are confirmed at checkout.", icon: CreditCard },
  { value: "crypto", label: "Crypto", detail: "Only shown as payable when a supported processor and asset are available.", icon: Coins },
  { value: "bigo", label: "BIGO beans", detail: "Platform credits are not a universal checkout currency; eligibility must be confirmed.", icon: RadioTower },
  { value: "tiktok", label: "TikTok coins", detail: "Platform coins are not assumed to be transferable or redeemable for these services.", icon: Sparkles },
];

export default function Explore() {
  const [country, setCountry] = useState("OTHER");
  const [currency, setCurrency] = useState("");
  const [countryTouched, setCountryTouched] = useState(false);
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [regionStatus, setRegionStatus] = useState("Checking region…");
  const [loadedMedia, setLoadedMedia] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    fetch("https://chatb2k.resofit.fit/api/public/visitor-locale", { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(2500) })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Region hint unavailable")))
      .then((hint: { country?: string | null; currency?: string | null }) => {
        if (!active) return;
        const match = countries.find((item) => item.code === hint.country);
        if (!countryTouched) {
          if (match) setCountry(match.code);
          if (hint.currency && currencies.includes(hint.currency) && !currencyTouched) setCurrency(hint.currency);
        }
        setRegionStatus(hint.country ? "Region suggested automatically · change anytime" : "Choose your country manually");
      })
      .catch(() => { if (active) setRegionStatus("Choose your country manually"); });
    return () => { active = false; };
  }, [countryTouched, currencyTouched]);
  const [rail, setRail] = useState("card");
  const [goal, setGoal] = useState("media");
  const selectedCountry = countries.find((item) => item.code === country) ?? countries[countries.length - 1];
  const selectedRail = rails.find((item) => item.value === rail) ?? rails[0];
  const recommendedPath = useMemo(() => goal === "talent" ? "/marketplace" : goal === "live" ? "/questionnaire" : goal === "agency" ? "/monetization" : "/monetization", [goal]);

  const updateCountry = (code: string) => {
    setCountryTouched(true);
    setCountry(code);
    const next = countries.find((item) => item.code === code);
    if (next) setCurrency(next.currency);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,.12),transparent_38%),radial-gradient(ellipse_at_70%_45%,rgba(16,185,129,.06),transparent_35%),#08080b] text-white">
      <Navbar />
      <section className="relative px-4 pb-14 pt-14 sm:px-6 sm:pt-20 lg:pb-20">
        <div className="pointer-events-none absolute -right-20 top-4 h-72 w-72 rounded-full bg-amber-300/10 blur-[100px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.08fr_.92fr]">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[.2em] text-amber-100"><Sparkles className="h-4 w-4" /> ResoFlex™ · ChatB2K orchestrated</div>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[.98] tracking-tight sm:text-6xl lg:text-7xl">Your creator world.<br /><span className="bg-gradient-to-r from-amber-200 via-yellow-100 to-emerald-200 bg-clip-text text-transparent">One clear next step.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/65 sm:text-lg">Explore media production, talent discovery, live creator pathways, and agency workflows—then follow a guided route that fits your goal.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#start" className="inline-flex h-12 items-center gap-2 rounded-full bg-amber-200 px-6 text-sm font-semibold text-black shadow-lg shadow-amber-900/20 transition hover:-translate-y-0.5 hover:bg-amber-100">Find my path <ArrowRight className="h-4 w-4" /></a>
              <Link to="/auth" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/[0.035] px-6 text-sm font-semibold text-white/85 transition hover:border-amber-200/50">Sign in <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-2 text-xs text-white/55"><span className="rounded-full border border-white/10 px-3 py-2">Mobile-first</span><span className="rounded-full border border-white/10 px-3 py-2">Transparent checkout</span><span className="rounded-full border border-white/10 px-3 py-2">Self-serve where enabled</span></div>
          </div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }} className="relative mx-auto w-full max-w-xl">
            <div className="absolute inset-8 rounded-[2rem] bg-gradient-to-br from-amber-200/15 to-emerald-300/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-white/[0.045] p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#101014]">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div className="flex items-center gap-2 text-sm font-medium"><span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-200/10 text-amber-200"><Bot className="h-4 w-4" /></span>ChatB2K welcome</div><span className="flex items-center gap-1.5 text-[10px] text-emerald-200"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Guided preview</span></div>
                <div className="space-y-3 p-4 sm:p-5">
                  <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white/[0.055] p-3 text-sm leading-6 text-white/75">Welcome to Elite Media. What are you here to do today?</div>
                  <div className="flex flex-wrap gap-2">{[{ label: "Create content", value: "media" }, { label: "Find talent", value: "talent" }, { label: "Go live", value: "live" }, { label: "Run an agency", value: "agency" }].map((item) => <button key={item.value} onClick={() => setGoal(item.value)} className={`rounded-full border px-3 py-2 text-xs transition ${goal === item.value ? "border-amber-200/60 bg-amber-200 text-black" : "border-white/10 bg-white/[0.03] text-white/70 hover:border-amber-200/40"}`}>{item.label}</button>)}</div>
                  <div className="rounded-2xl border border-amber-200/15 bg-amber-200/[0.06] p-3"><p className="text-[10px] uppercase tracking-[.2em] text-amber-200">Suggested next step</p><p className="mt-1 text-sm text-white/80">{goal === "talent" ? "Browse talent and discover profiles." : goal === "live" ? "Start the live creator host pathway." : goal === "agency" ? "Compare creator and agency plans." : "Explore creator media services."}</p><Link to={recommendedPath} className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-amber-200">Continue <ArrowRight className="h-3.5 w-3.5" /></Link></div>
                </div>
              </div>
              <div className="flex items-center justify-between px-3 py-3 text-[11px] text-white/45"><span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" />Your choices stay in this page</span><span>Step 1 of 3</span></div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.25em] text-amber-200">Choose a direction</p><h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Explore by outcome</h2></div><span className="hidden items-center gap-2 text-xs text-white/45 sm:flex"><ChevronDown className="h-4 w-4" /> Scroll to explore</span></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {pathways.map((item, index) => <motion.article key={item.title} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .15 }} transition={{ delay: index * .06 }} className="group relative min-h-[330px] overflow-hidden rounded-3xl border border-white/10 bg-[#101014] shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-amber-200/40">
            <video className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-700 group-hover:scale-105 group-hover:opacity-60" autoPlay muted loop playsInline preload="metadata" poster="/bg-hero.webp" onLoadedData={() => setLoadedMedia((current) => ({ ...current, [item.title]: true }))} onError={(event) => { setLoadedMedia((current) => ({ ...current, [item.title]: true })); event.currentTarget.style.opacity = "0.08"; }}><source src={item.video} type="video/mp4" /><source src={item.fallback} type="video/mp4" /></video>
            {!loadedMedia[item.title] && <div className="absolute left-4 top-14 z-10 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-2 text-[10px] text-white/65 backdrop-blur"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Preparing preview</div> }
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/10" />
            <div className="relative flex min-h-[330px] flex-col justify-end p-5">
              <div className="mb-auto flex items-center justify-between pt-1"><span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[10px] tracking-[.2em] text-white/80">{item.tag}</span><item.icon className="h-5 w-5 text-amber-200" /></div>
              <h3 className="text-2xl font-semibold tracking-tight">{item.title}</h3><p className="mt-2 text-sm leading-6 text-white/65">{item.copy}</p><Link to={item.to} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-amber-200">{item.cta}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
            </div>
          </motion.article>)}
        </div>
      </section>

      <section id="start" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-10 sm:px-6 lg:py-14">
        <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[.25em] text-amber-200">Your preferences</p><h2 className="mt-2 text-3xl font-semibold">Set your starting point</h2><p className="mt-3 text-sm leading-6 text-white/55">Choose your country and preferred payment rail. Your final payable amount, conversion basis, and supported methods must be shown before you authorize a transaction.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-white/65">Country / region<select value={country} onChange={(event) => updateCountry(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#111115] px-3 text-sm text-white outline-none focus:border-amber-200/50">{countries.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select><span className="mt-1 block text-[10px] text-white/40">{regionStatus}</span></label>
              <label className="text-xs font-medium text-white/65">Preferred display / payment currency<select value={currency} onChange={(event) => { setCurrencyTouched(true); setCurrency(event.target.value); }} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-[#111115] px-3 text-sm text-white outline-none focus:border-amber-200/50"><option value="">Choose currency</option>{currencies.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            </div>
            <div className="mt-5 space-y-2">{rails.map((item) => <button type="button" key={item.value} onClick={() => { setRail(item.value); }} className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${rail === item.value ? "border-amber-200/45 bg-amber-200/[0.07]" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}><span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${rail === item.value ? "bg-amber-200/15 text-amber-200" : "bg-white/5 text-white/55"}`}><item.icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-sm font-medium text-white/90">{item.label}{rail === item.value && <Check className="h-4 w-4 text-amber-200" />}</span><span className="mt-1 block text-xs leading-5 text-white/45">{item.detail}</span></span></button>)}</div>
            <div className="mt-5 rounded-2xl border border-emerald-200/15 bg-emerald-200/[0.045] p-4"><p className="flex items-center gap-2 text-xs font-semibold text-emerald-100"><ShieldCheck className="h-4 w-4" /> Before you pay</p><p className="mt-2 text-xs leading-5 text-white/60">No exchange rate is guessed here. This preference is not a payment authorization or a promise that every rail is supported in every country.</p></div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.015] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.25em] text-amber-200">Guided setup</p><h2 className="mt-2 text-3xl font-semibold">A calmer route to launch</h2></div><span className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-200/20 bg-amber-200/10 text-amber-200"><WandSparkles className="h-5 w-5" /></span></div>
            <div className="mt-7 space-y-4">{[{n:"01",title:"Choose your outcome",copy:"Media production, talent discovery, live creator onboarding, or agency operations."},{n:"02",title:"Connect only what you need",copy:"Platform connections and account permissions are requested when the selected workflow requires them."},{n:"03",title:"Review access and price",copy:"See plan limits, supported actions, final charge currency, fees, and renewal terms before confirming."},{n:"04",title:"Manage your workspace",copy:"Use self-serve settings for features and usage included in your plan; upgrades are explicit."}].map((step) => <div key={step.n} className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.035] font-mono text-sm text-amber-200">{step.n}</span><div><h3 className="font-medium">{step.title}</h3><p className="mt-1 text-sm leading-6 text-white/55">{step.copy}</p></div></div>)}</div>
            <div className="mt-7 flex flex-wrap gap-3"><Button asChild className="h-12 rounded-full bg-amber-200 px-6 text-black hover:bg-amber-100"><Link to={recommendedPath}>Continue with my goal <ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="outline" className="h-12 rounded-full border-white/15 bg-white/[0.02] px-6 text-white hover:bg-white/10"><Link to="/auth">Sign in to workspace</Link></Button></div>
            <p className="mt-4 text-xs leading-5 text-white/40">Selected: {selectedCountry.name} · {currency || "currency not selected"} · {selectedRail.label}. Actual checkout availability and payable amount are verified by the payment flow.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
        <div className="flex flex-col gap-5 rounded-3xl border border-amber-200/15 bg-gradient-to-r from-amber-200/[0.08] via-white/[0.025] to-emerald-200/[0.04] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"><div><p className="text-xs uppercase tracking-[.25em] text-amber-200">Need a hand?</p><h2 className="mt-2 text-2xl font-semibold">Your guide stays one tap away.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">Open ChatB2K for quick directions, or choose a service above to see its current onboarding path.</p></div><a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold hover:border-amber-200/40">Back to top <ArrowDownRight className="h-4 w-4" /></a></div>
      </section>
    </main>
  );
}
