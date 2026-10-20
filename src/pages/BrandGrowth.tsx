import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import * as Accordion from "@radix-ui/react-accordion";
import {
  ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarDays, Check, ChevronDown,
  CircleHelp, Clapperboard, Globe2, Instagram, Layers3, LineChart, Link2,
  Megaphone, ShieldCheck, Sparkles, Target, Video, Youtube, Building2,
} from "lucide-react";

const channels = [
  { name: "TikTok", category: "Short-form creator growth", icon: Video, status: "Connect account", description: "Plan creator-approved clips, build a publishing calendar, prepare captions and review eligible publishing integrations.", features: ["Clip briefs and hook variations", "Creator approval before publishing", "Publishing status and retry visibility"] },
  { name: "Meta", category: "Instagram + Facebook", icon: Instagram, status: "Connect account", description: "Coordinate Reels, feed creative and campaign assets across authorized Instagram professional and Facebook Page accounts.", features: ["Cross-platform asset variants", "Brand-safe caption review", "Campaign and publishing checklist"] },
  { name: "YouTube", category: "Shorts + channel operations", icon: Youtube, status: "Connect account", description: "Organize Shorts, titles, descriptions and channel-ready media with a review-first workflow.", features: ["Shorts metadata templates", "Thumbnail and asset checklist", "Publishing and performance review"] },
  { name: "Google Business Profile", category: "Local discovery + reputation", icon: Building2, status: "Start verification checklist", description: "Prepare business information, ownership access, profile completeness and verification evidence for Google's official process.", features: ["Business details completeness", "Verification readiness checklist", "Review response and post planning"] },
];

const growthSteps = [
  { n: "01", title: "Discover", text: "Define the audience, offer, location, creator niche and business objective." },
  { n: "02", title: "Build the brand kit", text: "Standardize positioning, visual direction, voice, bio, links, and reusable content templates." },
  { n: "03", title: "Produce and approve", text: "Create platform-specific assets from media the brand or creator has permission to use." },
  { n: "04", title: "Schedule and publish", text: "Route approved content through connected official APIs or a verified publishing provider. Otherwise, provide a clear manual handoff." },
  { n: "05", title: "Measure and improve", text: "Track available performance data, learn from results and refine the next content cycle." },
];

const portfolioTypes = [
  { title: "Creator media kit", tag: "CREATOR", icon: Video, detail: "Bio, audience summary, content pillars, example work, collaboration formats and contact path.", deliverables: ["Creator positioning statement", "Sample clip gallery", "Brand collaboration packages"] },
  { title: "Brand identity portfolio", tag: "BRAND", icon: Sparkles, detail: "A consistent visual and verbal identity across social profiles, landing pages and campaign assets.", deliverables: ["Brand story and voice", "Color and typography direction", "Social templates and profile copy"] },
  { title: "Campaign case study", tag: "CAMPAIGN", icon: Megaphone, detail: "A presentation-ready campaign brief, creative variations, deliverables, approved results and learnings.", deliverables: ["Campaign objective and audience", "Creative concepts and asset list", "Results only where measured and verified"] },
  { title: "Agency capability deck", tag: "AGENCY", icon: BriefcaseBusiness, detail: "A premium service portfolio for agencies coordinating multiple creators and brand campaigns.", deliverables: ["Services and process", "Sample production workflow", "Scope, turnaround and reporting model"] },
];

const checklist = [
  "Use a Google account authorized to manage the business profile.",
  "Confirm the real-world business name, address or service area, phone, website and operating details.",
  "Check for an existing profile before creating a duplicate.",
  "Complete Google's currently offered verification method in the official interface.",
  "Submit genuine evidence requested by Google; never fabricate documents or location proof.",
  "After verification, maintain accurate details and use eligible profile features in accordance with Google's policies.",
];

const faqs = [
  { q: "Does this page mean my social accounts are already connected?", a: "No. These are product workflows and setup entry points. A channel is only connected when OAuth or the official authorization flow succeeds, the required permissions are present, and a real account/API test passes." },
  { q: "Can Elite NG automatically publish to TikTok, Meta and YouTube?", a: "Automation depends on each platform's current API eligibility, account type, permissions, app review and enabled integration. Where those prerequisites are not verified, the workflow must stay in approval and manual handoff mode rather than claiming that posts were published." },
  { q: "Can Elite NG verify my Google Business Profile for me?", a: "Elite NG can guide readiness and organize the checklist, but only Google controls its verification decision and available verification methods. Business owners must submit authentic evidence in Google's official interface." },
  { q: "What can I put in my branding portfolio?", a: "Use approved brand assets, clear service descriptions, examples you have permission to show, and measured results with context. Label concept work and illustrative mockups clearly; do not present them as client work." },
  { q: "Is audience growth guaranteed?", a: "No. The service improves consistency, creative quality and workflow. Reach, followers, leads and sales depend on the audience, offer, platform distribution and many factors outside the service's control." },
];

const growthStyles = `
.elite-growth{background:#070707;position:relative;isolation:isolate;color:#fff}
.elite-growth:before{content:"";position:absolute;inset:0;z-index:-2;pointer-events:none;background:radial-gradient(ellipse at 8% 4%,rgba(217,181,97,.15),transparent 35%),radial-gradient(ellipse at 92% 35%,rgba(104,83,42,.13),transparent 32%),linear-gradient(180deg,#080808,#0d0c0a 50%,#070707);background-size:150% 150%;animation:elite-growth-bg 24s ease-in-out infinite alternate}
.elite-growth .g-glass{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.10);backdrop-filter:blur(24px) saturate(130%);-webkit-backdrop-filter:blur(24px) saturate(130%)}
.elite-growth .g-gold{background:linear-gradient(115deg,#f7e8b8,#e4c16b 42%,#a18140 72%,#f2d991);background-clip:text;-webkit-background-clip:text;color:transparent}
.elite-growth .g-kicker{font-size:10px;letter-spacing:.18em;font-weight:700;color:rgba(233,201,121,.86)}
.elite-growth .g-pill{display:inline-flex;align-items:center;gap:.45rem;border:1px solid rgba(233,201,121,.27);background:rgba(233,201,121,.07);border-radius:999px;padding:.5rem .85rem;color:#f2d999;font-size:10px;font-weight:600;letter-spacing:.1em}
.elite-growth .g-card{border:1px solid rgba(255,255,255,.1);background:linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.015));transition:transform .3s ease,border-color .3s ease}
.elite-growth .g-card:hover{transform:translateY(-4px);border-color:rgba(233,201,121,.35)}
.elite-growth .g-cta{background:linear-gradient(115deg,#f2d991,#d2ad58 65%,#e8cb80);color:#17130a;transition:transform .25s ease}
.elite-growth .g-cta:hover{transform:translateY(-2px)}
@keyframes elite-growth-bg{from{background-position:0 0}to{background-position:100% 100%}}
@media(prefers-reduced-motion:reduce){.elite-growth:before{animation:none}.elite-growth .g-card,.elite-growth .g-cta{transition:none}}
`;

export default function BrandGrowth() {
  const [activeChannel, setActiveChannel] = useState("TikTok");
  const [selectedPortfolio, setSelectedPortfolio] = useState("Creator media kit");
  const selected = channels.find((item) => item.name === activeChannel) ?? channels[0];
  const portfolio = portfolioTypes.find((item) => item.title === selectedPortfolio) ?? portfolioTypes[0];
  return (
    <main className="elite-growth min-h-screen overflow-hidden">
      <Navbar />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true"><div className="absolute -left-28 top-44 h-80 w-80 rounded-full bg-amber-200/10 blur-[100px]" /><div className="absolute -right-28 top-[38rem] h-96 w-96 rounded-full bg-yellow-700/10 blur-[110px]" /></div>
      <motion.header initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: "easeOut" }} className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 md:pb-24 md:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <span className="g-pill mb-7"><span className="h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_12px_#e9c979]" /> ELITE NG · BRAND GROWTH STUDIO</span>
          <p className="g-kicker mb-5">CONTENT SYSTEMS · CREATOR AUTOMATION · BRAND PRESENCE</p>
          <h1 className="text-balance text-5xl font-semibold leading-[.98] tracking-[-.055em] sm:text-7xl md:text-8xl">Build a brand that <span className="g-gold">moves with intent.</span></h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-white/60 sm:text-lg">Coordinate creator content, platform-ready publishing workflows, premium brand portfolios and local business readiness from one clear operating layer.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="g-cta h-12 rounded-full px-7 font-semibold"><Link to="/questionnaire">Plan my growth <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline" className="g-glass h-12 rounded-full border-white/15 bg-white/[.03] px-7 text-white hover:bg-white/[.08]"><Link to="/monetization">Explore services <Layers3 className="ml-2 h-4 w-4" /></Link></Button>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-2">{["Approval-first automation", "Creator & brand portfolios", "Official account connections", "Measured growth"].map((label) => <span key={label} className="rounded-full border border-white/10 bg-white/[.025] px-3 py-2 text-xs text-white/55">{label}</span>)}</div>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-3 sm:grid-cols-3">
          {[{icon:Target,title:"Strategy",text:"Audience, offer, platform and campaign direction."},{icon:Clapperboard,title:"Production",text:"Approved clips, captions, visual consistency and asset delivery."},{icon:LineChart,title:"Optimization",text:"Review available analytics and improve the next content cycle."}].map(({icon:Icon,title,text})=><div key={title} className="g-glass rounded-2xl p-5 text-left"><Icon className="mb-5 h-5 w-5 text-[#e9c979]"/><h2 className="text-lg font-medium">{title}</h2><p className="mt-2 text-sm leading-6 text-white/50">{text}</p></div>)}
        </div>
      </motion.header>

      <motion.section initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.55, ease: "easeOut" }} className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-20">
        <div className="mb-9 max-w-3xl"><p className="g-kicker mb-3">CHANNEL WORKFLOWS</p><h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">One studio. The right platform workflow.</h2><p className="mt-4 text-sm leading-6 text-white/55">Select a channel to explore its intended workflow. Connection status is not asserted until authorization and a real integration test succeed.</p></div>
        <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {channels.map(({name,category,icon:Icon})=><button key={name} onClick={()=>setActiveChannel(name)} className={`g-glass flex items-center gap-4 rounded-2xl p-4 text-left transition ${activeChannel===name?"border-[#e9c979]/50 bg-amber-100/[.06]":"hover:border-white/20"}`}><span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[.04]"><Icon className="h-5 w-5 text-[#e9c979]"/></span><span className="min-w-0 flex-1"><span className="block font-medium">{name}</span><span className="mt-1 block text-xs text-white/45">{category}</span></span><ArrowRight className={`h-4 w-4 ${activeChannel===name?"text-[#e9c979]":"text-white/25"}`}/></button>)}
          </div>
          <motion.article key={activeChannel} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28 }} className="g-card rounded-[1.8rem] p-6 sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-3"><span className="g-pill">{selected.category}</span><span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-white/45">Integration status: unverified</span></div>
            <div className="mt-7 flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#e9c979]/25 bg-[#e9c979]/[.07]"><selected.icon className="h-7 w-7 text-[#e9c979]"/></span><div><h3 className="text-2xl font-semibold">{selected.name}</h3><p className="mt-1 text-sm text-white/45">{selected.category}</p></div></div>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/60">{selected.description}</p>
            <ul className="mt-6 space-y-3">{selected.features.map((feature)=><li key={feature} className="flex gap-3 text-sm text-white/70"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#e9c979]"/>{feature}</li>)}</ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button asChild className="g-cta h-11 rounded-full px-5 font-semibold"><Link to="/auth">{selected.status}<ArrowRight className="ml-2 h-4 w-4"/></Link></Button><Button asChild variant="outline" className="h-11 rounded-full border-white/15 bg-white/[.02] px-5 text-white hover:bg-white/[.06]"><Link to="/questionnaire">Request setup plan</Link></Button></div>
            <p className="mt-4 text-xs leading-5 text-white/35">This action opens the existing sign-in journey. It does not by itself authorize a platform, verify a business, or enable automatic posting.</p>
          </motion.article>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.55, ease: "easeOut" }} className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
        <div className="mb-9 max-w-3xl"><p className="g-kicker mb-3">BRAND PORTFOLIO BUILDER</p><h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Show the value. Tell the story.</h2><p className="mt-4 text-sm leading-6 text-white/55">Choose a portfolio format to see its recommended contents. Examples and metrics should be genuine, permissioned and accurately labeled.</p></div>
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="grid gap-3 sm:grid-cols-2">{portfolioTypes.map(({title,tag,icon:Icon})=><button key={title} onClick={()=>setSelectedPortfolio(title)} className={`g-card rounded-2xl p-5 text-left ${selectedPortfolio===title?"border-[#e9c979]/50":""}`}><span className="g-kicker">{tag}</span><Icon className="my-5 h-6 w-6 text-[#e9c979]"/><h3 className="font-medium">{title}</h3><p className="mt-2 text-xs text-white/45">Explore deliverables <ArrowRight className="ml-1 inline h-3 w-3"/></p></button>)}</div>
          <motion.div key={selectedPortfolio} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="g-glass rounded-[1.8rem] p-6 sm:p-8"><p className="g-kicker">PORTFOLIO BLUEPRINT</p><h3 className="mt-4 text-2xl font-semibold">{portfolio.title}</h3><p className="mt-4 text-sm leading-7 text-white/60">{portfolio.detail}</p><h4 className="mt-7 text-sm font-semibold">Recommended deliverables</h4><ul className="mt-4 space-y-3">{portfolio.deliverables.map((item)=><li key={item} className="flex gap-3 text-sm text-white/70"><Check className="h-4 w-4 shrink-0 text-[#e9c979]"/>{item}</li>)}</ul><Button asChild className="g-cta mt-8 h-11 rounded-full px-5 font-semibold"><Link to="/questionnaire">Build this portfolio <ArrowRight className="ml-2 h-4 w-4"/></Link></Button></motion.div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.55, ease: "easeOut" }} className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div><p className="g-kicker mb-3">GOOGLE BUSINESS PROFILE</p><h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Get verification-ready. <span className="g-gold">The right way.</span></h2><p className="mt-5 text-sm leading-7 text-white/55">Prepare your real business information and evidence before using Google's official verification flow. Google determines the methods available and the final verification decision.</p><a href="https://support.google.com/business/answer/7107242" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-sm text-[#f2d991] hover:underline">Open Google's verification guidance <Globe2 className="h-4 w-4"/></a><div className="g-glass mt-8 rounded-2xl p-5"><div className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-[#e9c979]"/><p className="text-xs leading-6 text-white/55">Elite NG provides readiness guidance and workflow organization. It cannot bypass Google's checks or promise approval.</p></div></div></div>
          <div className="g-glass rounded-[1.8rem] p-6 sm:p-8"><h3 className="text-xl font-semibold">Business readiness checklist</h3><p className="mt-2 text-sm text-white/45">Track your preparation locally while you work through the official process.</p><VerificationChecklist items={checklist}/><Button asChild className="g-cta mt-7 h-11 rounded-full px-5 font-semibold"><a href="https://support.google.com/business/answer/7107242" target="_blank" rel="noreferrer">Continue to Google <ArrowRight className="ml-2 h-4 w-4"/></a></Button></div>
        </div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.55, ease: "easeOut" }} className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:py-20">
        <div className="mb-10 max-w-3xl"><p className="g-kicker mb-3">THE BRAND GROWTH LOOP</p><h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">A system you can actually operate.</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{growthSteps.map((step)=><div key={step.n} className="g-card rounded-2xl p-5"><span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e9c979]/30 text-xs text-[#e9c979]">{step.n}</span><h3 className="mt-5 font-medium">{step.title}</h3><p className="mt-3 text-sm leading-6 text-white/50">{step.text}</p></div>)}</div>
      </motion.section>

      <motion.section initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.12 }} transition={{ duration: 0.55, ease: "easeOut" }} className="mx-auto max-w-4xl px-4 py-14 sm:px-6 md:py-20"><div className="mb-8 text-center"><p className="g-kicker mb-3">CLEAR EXPECTATIONS</p><h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">Before you connect.</h2></div><Accordion.Root type="single" collapsible className="space-y-3">{faqs.map((faq,index)=><Accordion.Item value={`growth-faq-${index}`} key={faq.q} className="g-glass overflow-hidden rounded-2xl"><Accordion.Header><Accordion.Trigger className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-medium hover:text-[#f2d991]">{faq.q}<ChevronDown className="h-4 w-4 shrink-0"/></Accordion.Trigger></Accordion.Header><Accordion.Content className="px-5 pb-5 text-sm leading-7 text-white/55">{faq.a}</Accordion.Content></Accordion.Item>)}</Accordion.Root></motion.section>
      <footer className="border-t border-white/10 px-4 py-10 text-center"><p className="text-sm font-bold tracking-[.25em]">ELITE <span className="text-[#e9c979]">NG</span></p><p className="mt-3 text-xs text-white/40">Brand growth built on clear permissions, real integrations and measurable work.</p><div className="mt-5 flex flex-wrap justify-center gap-5 text-xs text-white/45"><Link to="/monetization" className="hover:text-white">Services & pricing</Link><Link to="/pathways" className="hover:text-white">Creator pathways</Link><Link to="/auth" className="hover:text-white">Sign in</Link></div></footer>
      <style>{growthStyles}</style>
    </main>
  );
}

function VerificationChecklist({items}:{items:string[]}) {
  const [checked,setChecked]=useState<boolean[]>(items.map(()=>false));
  return <div className="mt-6 space-y-3">{items.map((item,index)=><label key={item} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[.07] bg-white/[.02] p-4 text-sm leading-6 text-white/65"><input type="checkbox" checked={checked[index]} onChange={(event)=>setChecked((old)=>old.map((value,i)=>i===index?event.target.checked:value))} className="mt-1 h-4 w-4 accent-amber-300"/><span className={checked[index]?"text-white/35 line-through":""}>{item}</span></label>)}<p className="text-xs text-white/35">{checked.filter(Boolean).length} of {items.length} preparation steps checked. This checklist is not submitted to Google.</p></div>;
}
