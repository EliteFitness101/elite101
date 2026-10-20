import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as Accordion from "@radix-ui/react-accordion";
import {
  ArrowDownRight, ArrowRight, Check, ChevronDown, Clapperboard, Crown, Film,
  Layers3, ShieldCheck, Sparkles, Users, WandSparkles,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";

type Offer = {
  slug: string;
  name: string;
  eyebrow: string;
  price: number;
  period: string;
  audience: string;
  description: string;
  outcome: string;
  features: string[];
  includes: string[];
  cta: string;
  popular?: boolean;
};

const offers: Offer[] = [
  {
    slug: "highlight-launch-pack",
    name: "Highlight Launch Pack",
    eyebrow: "One-time production",
    price: 49,
    period: "once",
    audience: "Creators ready to publish better clips",
    description: "Turn creator-approved livestream or recorded footage into polished, platform-ready short-form content—with the finishing touches that make every post feel intentional.",
    outcome: "A ready-to-publish content batch, delivered to an agreed timeline.",
    features: ["Edited vertical short clips (quantity agreed before checkout)", "Branded cover frames", "Caption copy and suggested hooks", "Platform-ready exports", "One consolidated revision round", "Secure delivery link"],
    includes: ["Brief and source-media review", "Editing and quality review", "Creator brand styling", "Delivery checklist"],
    cta: "Start a launch pack",
  },
  {
    slug: "creator-starter",
    name: "Starter",
    eyebrow: "Creator workspace",
    price: 9,
    period: "month",
    audience: "Creators building a consistent posting habit",
    description: "Keep your content workflow organized in one place with a structured library, reusable captions, and a practical plan for what to publish next.",
    outcome: "Less time searching for content; a clearer path from idea to post.",
    features: ["Organized creator asset library", "Content planning workspace", "Caption and hook templates", "Export checklist", "Basic usage overview", "Self-serve help resources"],
    includes: ["Monthly software access", "Personal workspace", "Standard support", "Plan status and usage visibility"],
    cta: "Choose Starter",
  },
  {
    slug: "creator-pro",
    name: "Pro",
    eyebrow: "For frequent publishers",
    price: 19,
    period: "month",
    audience: "Creators publishing across multiple channels",
    description: "A more complete creator workflow for people who publish frequently and want repeatable organization, faster preparation, and fewer handoffs.",
    outcome: "A repeatable content operation with room to scale.",
    features: ["Everything in Starter", "Expanded asset organization", "Reusable brand and caption presets", "Advanced content planning", "Priority workflow support", "Publishing integrations only where connected and verified"],
    includes: ["Monthly software access", "Expanded workspace allowances", "Priority support queue", "Feature and usage overview"],
    cta: "Choose Pro",
    popular: true,
  },
  {
    slug: "agency-workspace",
    name: "Agency Workspace",
    eyebrow: "Multi-creator operations",
    price: 99,
    period: "month",
    audience: "Teams coordinating multiple creators",
    description: "Give your team a more organized way to coordinate creator assets, production requests, brand requirements, and publishing handoffs.",
    outcome: "A clearer shared workflow across creators and collaborators.",
    features: ["Multi-creator workspace structure", "Shared asset organization", "Creator-specific brand notes", "Production request tracking", "Team workflow coordination", "Monthly activity overview"],
    includes: ["Workspace subscription", "Defined team access", "Onboarding checklist", "Production services scoped separately"],
    cta: "Discuss an agency pilot",
  },
  {
    slug: "agency-production-retainer",
    name: "Agency Production",
    eyebrow: "Managed service",
    price: 300,
    period: "month",
    audience: "Agencies needing recurring editing and delivery",
    description: "A managed monthly production engagement with an agreed content volume, brand standards, review process, and delivery calendar.",
    outcome: "Predictable production capacity with explicit scope and turnaround.",
    features: ["Monthly production plan", "Creator-specific editing direction", "Quality review before delivery", "Defined delivery calendar", "Agreed revision allowance", "Monthly service review"],
    includes: ["Scope and volume confirmed in proposal", "Delivery and review workflow", "Asset handoff", "Transparent service boundaries"],
    cta: "Request a production quote",
  },
];

const faqs = [
  { q: "Are these prices final?", a: "These are launch-test prices. The exact clip count, delivery window, storage allowance, revision policy, applicable taxes, and any local-currency amount must be confirmed on the order before payment." },
  { q: "Do you automatically capture and publish my livestreams?", a: "Only integrations explicitly shown as available in your account should be treated as automated. Early production packages can use media you provide or explicitly authorize, with manual review and delivery where needed." },
  { q: "Can I use Elite Ng from Nigeria and internationally?", a: "The offer is designed for Nigerian and international creators. Checkout currency, payment methods, settlement eligibility, and taxes are confirmed by the enabled payment provider at checkout." },
  { q: "Can I cancel a subscription?", a: "Subscription terms and cancellation instructions should be displayed before payment. Cancel according to the billing terms attached to the selected plan; cancellation does not erase amounts already due for completed services." },
  { q: "What content can I submit?", a: "Submit only media you own or are authorized to process. You remain responsible for the necessary creator, platform, music, and third-party permissions." },
];

const formatUsd = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

function OfferButton({ offer }: { offer: Offer }) {
  const isAgency = offer.slug.includes("agency");
  const intent = offer.slug === "highlight-launch-pack" ? "elite-highlight-launch-pack" : `elite-${offer.slug}`;
  const destination = isAgency ? `/auth?role=brand&intent=${intent}` : `/auth?role=model&intent=${intent}`;
  return (
    <Button asChild className="elite-cta h-12 w-full rounded-full font-semibold">
      <Link to={destination}>{offer.cta}<ArrowRight className="ml-2 h-4 w-4" /></Link>
    </Button>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  return (
    <article className={`elite-offer-card relative flex h-full flex-col rounded-[1.7rem] p-6 md:p-7 ${offer.popular ? "elite-offer-featured" : ""}`}>
      {offer.popular && <span className="elite-pill absolute right-5 top-5"><Sparkles className="h-3 w-3" /> MOST POPULAR</span>}
      <p className="elite-kicker mb-3">{offer.eyebrow}</p>
      <h3 className="pr-2 text-2xl font-semibold tracking-tight">{offer.name}</h3>
      <p className="mt-3 min-h-[4.5rem] text-sm leading-6 text-white/60">{offer.description}</p>
      <div className="mt-6 flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-tight text-[#f4d58b]">{formatUsd(offer.price)}</span>
        <span className="text-sm text-white/45">/{offer.period}</span>
      </div>
      <p className="mt-2 text-xs text-white/45">Proposed launch price · USD</p>
      <div className="my-6 h-px bg-white/10" />
      <p className="mb-4 text-sm font-medium text-white/80">Designed for: {offer.audience}</p>
      <ul className="mb-7 flex-1 space-y-3">
        {offer.features.map((feature) => <li key={feature} className="flex gap-3 text-sm leading-5 text-white/70"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#e7c36f]" />{feature}</li>)}
      </ul>
      <OfferButton offer={offer} />
      <p className="mt-3 text-center text-[11px] leading-4 text-white/40">Scope and availability confirmed before payment.</p>
      <Link to={`/offers/${offer.slug}`} className="mt-4 inline-flex items-center justify-center gap-1 text-xs text-[#f4d58b]/80 hover:text-[#f4d58b]">View full details <ArrowRight className="h-3 w-3" /></Link>
    </article>
  );
}

function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [menuOpen, setMenuOpen] = useState(false);
  const subscriptions = offers.filter((offer) => ["creator-starter", "creator-pro", "agency-workspace"].includes(offer.slug));
  const monthlyPrice = (offer: Offer) => billing === "annual" ? offer.price * 10 : offer.price;
  return (
    <main className="elite-page min-h-screen overflow-hidden text-white">
      <Navbar />
      <div className="elite-atmosphere" aria-hidden="true"><span /><span /><span /></div>
      <header className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 md:pb-24 md:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="elite-pill mb-7"><span className="elite-live-dot" /> THE CREATOR OPERATING SYSTEM</span>
          <p className="elite-kicker mb-5">ELITE NG · CREATOR GROWTH & MEDIA</p>
          <h1 className="text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.055em] sm:text-7xl md:text-8xl">Make every moment <span className="elite-gold-text">work harder.</span></h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">Premium creator media production and a cleaner publishing workflow—built for creators and the teams helping them grow.</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#offers" className="elite-cta inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold">Explore offers <ArrowRight className="ml-2 h-4 w-4" /></a>
            <a href="#how-it-works" className="elite-glass inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-medium text-white/80">How it works <ArrowDownRight className="ml-2 h-4 w-4" /></a>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {["Creator-approved media", "Clear deliverables", "Nigeria + international", "Human-reviewed delivery"].map((label) => <span className="elite-soft-pill" key={label}>{label}</span>)}
          </div>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-3 sm:grid-cols-3">
          {[
            { icon: Film, title: "Create", text: "Turn authorized footage into polished short-form assets." },
            { icon: Layers3, title: "Organize", text: "Keep clips, captions, covers, and plans together." },
            { icon: Users, title: "Scale", text: "Coordinate multiple creators with a defined workflow." },
          ].map(({ icon: Icon, title, text }) => <div className="elite-glass rounded-2xl p-5 text-left" key={title}><Icon className="mb-5 h-5 w-5 text-[#e9c979]" /><p className="text-lg font-medium">{title}</p><p className="mt-2 text-sm leading-6 text-white/50">{text}</p></div>)}
        </div>
      </header>

      <section id="offers" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-4 py-12 sm:px-6 md:py-20">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><p className="elite-kicker mb-3">CHOOSE YOUR NEXT MOVE</p><h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">A better workflow, <span className="elite-gold-text">at your pace.</span></h2><p className="mt-4 max-w-2xl text-sm leading-6 text-white/55">Start with a defined production package. Add software or team capacity when your workflow is ready.</p></div>
          <div className="elite-glass inline-flex w-fit rounded-full p-1" role="group" aria-label="Subscription billing view">
            <button onClick={() => setBilling("monthly")} className={`rounded-full px-4 py-2 text-xs font-medium transition ${billing === "monthly" ? "bg-[#e9c979] text-black" : "text-white/60"}`}>Monthly</button>
            <button onClick={() => setBilling("annual")} className={`rounded-full px-4 py-2 text-xs font-medium transition ${billing === "annual" ? "bg-[#e9c979] text-black" : "text-white/60"}`}>Annual · 2 months free</button>
          </div>
        </div>
        {billing === "annual" && <p className="mb-5 text-xs text-[#f4d58b]/80">Illustrative annual billing: 10 monthly payments’ worth charged per year. Enable only after annual billing is configured in checkout.</p>}
        <div className="grid gap-4 lg:grid-cols-3">
          {subscriptions.map((offer) => <OfferCard key={offer.slug} offer={billing === "annual" ? { ...offer, price: monthlyPrice(offer), period: "year" } : offer} />)}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {offers.filter((offer) => ["highlight-launch-pack", "agency-production-retainer"].includes(offer.slug)).map((offer) => <OfferCard key={offer.slug} offer={offer} />)}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mb-10 max-w-3xl"><p className="elite-kicker mb-3">COMPARE THE VALUE</p><h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Know what you’re choosing.</h2><p className="mt-4 text-sm leading-6 text-white/55">Production is a service. Subscriptions are software access. They are priced separately so editing work is never silently bundled into an unlimited plan.</p></div>
        <div className="elite-glass overflow-x-auto rounded-3xl">
          <table className="w-full min-w-[700px] border-collapse text-left text-sm">
            <thead><tr className="border-b border-white/10 text-white/45"><th className="p-5 font-medium">Included value</th><th className="p-5 font-medium">Launch Pack</th><th className="p-5 font-medium">Starter</th><th className="p-5 font-medium">Pro</th><th className="p-5 font-medium">Agency</th></tr></thead>
            <tbody>
              {[
                ["Edited video production", "Included in agreed scope", "—", "—", "Optional retainer"],
                ["Branded covers & captions", "Included", "Templates", "Reusable presets", "Creator-specific"],
                ["Asset library", "Delivery link", "Core workspace", "Expanded workspace", "Shared workspace"],
                ["Content planning", "Delivery notes", "Core", "Advanced", "Team workflow"],
                ["Multiple creators", "Per order", "—", "Limited to account", "Designed for teams"],
                ["Publishing automation", "Not implied", "Where verified", "Where verified", "Where verified"],
                ["Service-level turnaround", "Agreed per order", "Self-serve", "Priority workflow support", "Agreed in proposal"],
              ].map((row) => <tr className="border-b border-white/[0.06] last:border-0" key={row[0]}>{row.map((cell, index) => <td className={`p-5 align-top ${index === 0 ? "font-medium text-white/80" : "text-white/55"}`} key={cell}>{cell}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section id="how-it-works" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div><p className="elite-kicker mb-3">SIMPLE BY DESIGN</p><h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">From raw footage to <span className="elite-gold-text">ready to publish.</span></h2><p className="mt-5 text-sm leading-7 text-white/55">A transparent workflow from brief to delivery. Automated capture and posting are used only when the relevant integration has been tested and enabled.</p><Link className="mt-7 inline-flex items-center text-sm font-medium text-[#f4d58b] hover:gap-3 gap-2 transition-all" to="/questionnaire">Tell us what you need <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="space-y-3">
            {[
              { n: "01", title: "Choose your offer", text: "Select a production package, creator workspace, or agency engagement." },
              { n: "02", title: "Share the brief and authorized media", text: "Confirm brand style, platform formats, scope, permissions, and deadline." },
              { n: "03", title: "Review and refine", text: "Receive the agreed output and submit consolidated feedback within the revision limit." },
              { n: "04", title: "Build a repeatable rhythm", text: "Move to a subscription or retainer only when recurring value is clear." },
            ].map((step) => <div className="elite-glass flex gap-5 rounded-2xl p-5 sm:p-6" key={step.n}><span className="elite-step-number">{step.n}</span><div><h3 className="font-medium">{step.title}</h3><p className="mt-2 text-sm leading-6 text-white/50">{step.text}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-14 sm:px-6 md:py-20">
        <div className="elite-glass rounded-[2rem] p-6 sm:p-10 md:p-14">
          <p className="elite-kicker mb-3">BUILT AROUND YOUR WORKFLOW</p><h2 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">Your content deserves more than a folder full of clips.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              { icon: Clapperboard, title: "Creator-first production", text: "A defined brief, approved media, agreed scope, and a quality review." },
              { icon: ShieldCheck, title: "Clear permissions", text: "Use media you own or are authorized to process and publish." },
              { icon: WandSparkles, title: "Premium presentation", text: "Consistent covers, captions, visual direction, and export standards." },
              { icon: Crown, title: "A path to recurring value", text: "Start small, learn what works, and add capacity as your needs grow." },
            ].map(({ icon: Icon, title, text }) => <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5" key={title}><Icon className="mb-4 h-5 w-5 text-[#e9c979]" /><h3 className="font-medium">{title}</h3><p className="mt-2 text-sm leading-6 text-white/50">{text}</p></div>)}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-4 py-14 sm:px-6 md:py-20">
        <div className="mb-8 text-center"><p className="elite-kicker mb-3">GOOD TO KNOW</p><h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Frequently asked.</h2></div>
        <Accordion.Root type="single" collapsible className="space-y-3">
          {faqs.map((faq, index) => <Accordion.Item value={`faq-${index}`} key={faq.q} className="elite-glass overflow-hidden rounded-2xl"><Accordion.Header><Accordion.Trigger className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-medium hover:text-[#f4d58b] [&[data-state=open]>svg]:rotate-180">{faq.q}<ChevronDown className="h-4 w-4 shrink-0 transition-transform" /></Accordion.Trigger></Accordion.Header><Accordion.Content className="px-5 pb-5 text-sm leading-7 text-white/55 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">{faq.a}</Accordion.Content></Accordion.Item>)}
        </Accordion.Root>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-4 py-10 text-center">
        <div className="mx-auto max-w-5xl"><div className="elite-wordmark">ELITE<span> NG</span></div><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">Creator growth. Premium media. Better systems.</p><div className="mt-6 flex flex-wrap justify-center gap-5 text-xs text-white/45"><a href="#offers" className="hover:text-white">Offers</a><Link to="/pathways" className="hover:text-white">Creator pathways</Link><Link to="/questionnaire" className="hover:text-white">Get started</Link><Link to="/auth" className="hover:text-white">Sign in</Link></div><p className="mt-8 text-[11px] text-white/30">Prices are proposed launch-test prices. Final scope, currency, tax, payment methods, and terms are confirmed before purchase.</p></div>
      </footer>
      <style>{eliteStyles}</style>
    </main>
  );
}

function OfferDetailPage() {
  const { slug } = useParams();
  const offer = useMemo(() => offers.find((item) => item.slug === slug), [slug]);
  if (!offer) return <main className="elite-page min-h-screen text-white"><Navbar /><div className="mx-auto max-w-3xl px-4 py-28 text-center"><h1 className="text-4xl font-semibold">Offer not found</h1><p className="mt-4 text-white/60">This offer may have changed or is not available.</p><Button asChild className="elite-cta mt-8 rounded-full"><Link to="/monetization">Browse all offers <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div><style>{eliteStyles}</style></main>;
  return (
    <main className="elite-page min-h-screen overflow-hidden text-white"><Navbar /><div className="elite-atmosphere" aria-hidden="true"><span /><span /><span /></div>
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-14 sm:px-6 md:py-24">
        <Link to="/monetization" className="inline-flex items-center gap-2 text-xs text-white/50 hover:text-[#f4d58b]">← All offers</Link>
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div><span className="elite-pill mb-6">{offer.eyebrow}</span><p className="elite-kicker mt-7">ELITE NG · PRODUCT DETAILS</p><h1 className="mt-4 text-5xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-7xl">{offer.name.split(" ").slice(0,-1).join(" ")} <span className="elite-gold-text">{offer.name.split(" ").slice(-1)}</span></h1><p className="mt-6 max-w-2xl text-lg leading-8 text-white/60">{offer.description}</p>
            <div className="elite-glass mt-8 rounded-2xl p-5"><p className="elite-kicker mb-2">THE VALUE</p><p className="text-base leading-7 text-white/80">{offer.outcome}</p></div>
            <h2 className="mt-10 text-xl font-semibold">What’s included</h2><ul className="mt-5 space-y-4">{offer.includes.map((item) => <li key={item} className="flex gap-3 text-sm text-white/65"><Check className="h-4 w-4 shrink-0 text-[#e9c979]" />{item}</li>)}</ul>
            <h2 className="mt-10 text-xl font-semibold">Feature details</h2><ul className="mt-5 grid gap-3 sm:grid-cols-2">{offer.features.map((item) => <li className="elite-glass rounded-xl p-4 text-sm leading-6 text-white/65" key={item}>{item}</li>)}</ul>
          </div>
          <aside className="h-fit lg:sticky lg:top-8"><div className="elite-offer-card elite-offer-featured rounded-[1.8rem] p-6 sm:p-8"><p className="elite-kicker">{offer.audience}</p><div className="mt-5 flex items-baseline gap-2"><span className="text-5xl font-semibold text-[#f4d58b]">{formatUsd(offer.price)}</span><span className="text-sm text-white/45">/{offer.period}</span></div><p className="mt-3 text-xs leading-5 text-white/45">Proposed launch price in USD. Local equivalent, availability, scope, and applicable taxes are confirmed before payment.</p><div className="my-6 h-px bg-white/10" /><OfferButton offer={offer} /><p className="mt-4 text-xs leading-5 text-white/40">No automatic capture or publishing is implied unless the relevant integration is enabled and verified.</p><div className="mt-6 rounded-xl border border-white/10 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[#e9c979]">Before you order</p><p className="mt-2 text-xs leading-5 text-white/50">Have your creator handle, target platforms, content permissions, brand references, and desired delivery window ready.</p></div></div><div className="mt-4 text-center"><Link to="/questionnaire" className="text-xs text-white/50 underline decoration-white/20 underline-offset-4 hover:text-white">Not sure which offer fits? Tell us what you need.</Link></div></aside>
        </div>
        <div className="mt-16 border-t border-white/10 pt-8"><h2 className="text-2xl font-semibold">Explore related offers</h2><div className="mt-5 grid gap-4 md:grid-cols-3">{offers.filter((item) => item.slug !== offer.slug).slice(0,3).map((item) => <Link to={`/offers/${item.slug}`} key={item.slug} className="elite-glass rounded-2xl p-5 transition hover:-translate-y-1 hover:border-[#e9c979]/40"><p className="elite-kicker">{item.eyebrow}</p><h3 className="mt-3 font-medium">{item.name}</h3><p className="mt-2 text-sm text-white/50">{formatUsd(item.price)} / {item.period}</p><span className="mt-5 inline-flex items-center gap-2 text-xs text-[#f4d58b]">View details <ArrowRight className="h-3 w-3" /></span></Link>)}</div></div>
      </div><style>{eliteStyles}</style>
    </main>
  );
}

const eliteStyles = `
.elite-page{background:#070707;position:relative;isolation:isolate}
.elite-page:before{content:"";position:absolute;inset:0;pointer-events:none;z-index:-1;background:radial-gradient(ellipse at 15% 4%,rgba(218,181,97,.13),transparent 38%),radial-gradient(ellipse at 86% 28%,rgba(111,88,43,.13),transparent 35%),linear-gradient(180deg,#080808 0%,#0c0b09 48%,#070707 100%);background-size:140% 140%;animation:elite-ambient 22s ease-in-out infinite alternate}
.elite-atmosphere{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}
.elite-atmosphere span{position:absolute;width:26rem;height:26rem;border-radius:999px;filter:blur(90px);opacity:.13;animation:elite-float 16s ease-in-out infinite alternate}
.elite-atmosphere span:nth-child(1){top:7%;left:-10rem;background:#d5b15e}
.elite-atmosphere span:nth-child(2){top:38%;right:-12rem;background:#8a6b30;animation-delay:-7s}
.elite-atmosphere span:nth-child(3){bottom:3%;left:38%;background:#c7a75a;animation-delay:-11s}
.elite-glass{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.10);backdrop-filter:blur(22px) saturate(135%);-webkit-backdrop-filter:blur(22px) saturate(135%)}
.elite-offer-card{background:linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.018));border:1px solid rgba(255,255,255,.11);box-shadow:0 24px 80px rgba(0,0,0,.22);transition:transform .35s ease,border-color .35s ease,background .35s ease}
.elite-offer-card:hover{transform:translateY(-4px);border-color:rgba(233,201,121,.32)}
.elite-offer-featured{border-color:rgba(233,201,121,.36);background:linear-gradient(145deg,rgba(233,201,121,.09),rgba(255,255,255,.025) 58%,rgba(255,255,255,.015))}
.elite-pill,.elite-soft-pill{display:inline-flex;align-items:center;gap:.45rem;border-radius:999px;border:1px solid rgba(233,201,121,.26);background:rgba(233,201,121,.07);padding:.55rem .9rem;color:#f2d999;font-size:10px;font-weight:600;letter-spacing:.12em}
.elite-soft-pill{border-color:rgba(255,255,255,.1);background:rgba(255,255,255,.035);color:rgba(255,255,255,.58);letter-spacing:.04em;font-weight:500}
.elite-live-dot{width:6px;height:6px;border-radius:50%;background:#e9c979;box-shadow:0 0 12px #e9c979;animation:elite-pulse 2s infinite}
.elite-kicker{font-size:10px;letter-spacing:.18em;font-weight:700;color:rgba(233,201,121,.85)}
.elite-gold-text{background:linear-gradient(115deg,#f7e8b8 0%,#e4c16b 40%,#9d7b39 72%,#f2d991 100%);background-clip:text;-webkit-background-clip:text;color:transparent}
.elite-cta{background:linear-gradient(115deg,#f2d991,#d2ad58 65%,#e8cb80);color:#17130a;box-shadow:0 8px 30px rgba(207,170,84,.14);transition:transform .25s ease,box-shadow .25s ease}
.elite-cta:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(207,170,84,.24);opacity:1}
.elite-glass.elite-cta{background:rgba(255,255,255,.05)}
.elite-step-number{display:flex;width:2.5rem;height:2.5rem;flex-shrink:0;align-items:center;justify-content:center;border:1px solid rgba(233,201,121,.28);border-radius:50%;color:#e9c979;font-size:.75rem}
.elite-wordmark{font-weight:800;letter-spacing:.22em;font-size:1.05rem}.elite-wordmark span{color:#e9c979}
@keyframes elite-ambient{from{background-position:0% 0%}to{background-position:100% 100%}}
@keyframes elite-float{from{transform:translate3d(0,-10px,0) scale(.94)}to{transform:translate3d(20px,25px,0) scale(1.08)}}
@keyframes elite-pulse{0%,100%{opacity:1}50%{opacity:.4}}
@media(prefers-reduced-motion:reduce){.elite-page:before,.elite-atmosphere span,.elite-live-dot{animation:none!important}.elite-offer-card,.elite-cta{transition:none!important}}
`;

export default function Monetization() {
  const { slug } = useParams();
  return slug ? <OfferDetailPage /> : <PricingPage />;
}
