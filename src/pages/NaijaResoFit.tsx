import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, MapPin, Users, ShieldCheck, Sparkles, Network, BriefcaseBusiness, GraduationCap, ChevronRight } from "lucide-react";

const layers = [
  { title: "State", detail: "Nigeria's 36 states and FCT", icon: MapPin, examples: "Rivers · Lagos · FCT · Enugu" },
  { title: "LGA", detail: "Local government discovery", icon: Network, examples: "Port Harcourt · Obio/Akpor · Ikwerre" },
  { title: "City & town", detail: "Cities, towns and neighbourhoods", icon: MapPin, examples: "City · Town · Community" },
  { title: "Community & kindred", detail: "Autonomous communities, kindreds and generations", icon: Users, examples: "Community · Autonomous · Kindred · Generation" },
  { title: "Family & genealogy", detail: "Paternal and maternal family connections", icon: ShieldCheck, examples: "Family · Paternal · Maternal · Genealogy" },
  { title: "Persona & portfolio", detail: "Identity-controlled profiles and evidence-backed work", icon: BriefcaseBusiness, examples: "Persona · Portfolio · Skill" },
  { title: "Skill & acquisition", detail: "Skills, training, categories and grades", icon: GraduationCap, examples: "Skill · Acquisition · Category · Subcategory · Grade" },
  { title: "Certification & deployment", detail: "Review, shortlist, verify, deploy and manage status", icon: ShieldCheck, examples: "Certified · Deploy · Application · Shortlisted · Verified · Active · Delisted" },
];

const lifecycle = ["Discover", "Assess", "Recommend", "Source", "Convert", "Fulfill", "Follow up", "Upsell", "Retain"];

export default function NaijaResoFit() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState("All pathways");
  const filtered = useMemo(() => layers.filter((item) => (item.title + " " + item.detail + " " + item.examples).toLowerCase().includes(query.toLowerCase())), [query]);
  return (
    <main className="min-h-screen bg-[#08090c] text-white">
      <header className="sticky top-0 z-30 border-b border-amber-200/15 bg-[#08090c]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link to="/" className="font-display text-xl tracking-widest">RESO<span className="text-amber-300">FIT</span> <span className="text-xs text-white/50">NAIJA</span></Link>
          <nav className="hidden gap-6 text-sm text-white/65 md:flex"><a href="#directory">Directory</a><a href="#pathways">Pathways</a><a href="#trust">Trust & privacy</a></nav>
          <Link to="/auth?role=model" className="rounded-full border border-amber-300/50 px-4 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-300/10">Create profile</Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-amber-300/10 blur-[110px]" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-cyan-300/10 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-[1.15fr_.85fr] md:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/5 px-4 py-2 text-xs uppercase tracking-[.2em] text-amber-200"><Sparkles className="h-4 w-4" /> Nigeria's people, skills & opportunity graph</div>
            <h1 className="max-w-3xl font-display text-5xl leading-[1.02] md:text-7xl">Every place.<br/><span className="text-amber-300">Every skill.</span><br/>A connected future.</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-white/65">Explore Nigerian communities, build a professional portfolio, discover skills and opportunities, and move through a transparent application and verification pathway.</p>
            <div className="mt-9 flex flex-wrap gap-3"><a href="#directory" className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-6 py-3 font-semibold text-black">Explore the directory <ArrowRight className="h-4 w-4"/></a><Link to="/auth?role=model" className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white hover:border-amber-200/60">Start an application</Link></div>
            <p className="mt-5 text-xs text-white/40">Profiles and credentials are subject to consent, review and verification. No public family records are exposed by default.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[.035] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl md:p-8">
            <div className="text-xs uppercase tracking-[.25em] text-amber-200">The Naija graph</div>
            <div className="mt-6 space-y-3">
              {["Geography & communities","People & family connections","Skills & learning pathways","Portfolio & opportunities","Verification & deployment"].map((item, i) => <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/30 p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-200/10 text-sm font-bold text-amber-200">0{i+1}</span><span className="text-sm font-medium">{item}</span><ChevronRight className="ml-auto h-4 w-4 text-white/35"/></div>)}
            </div>
            <div className="mt-6 rounded-2xl border border-amber-200/15 bg-amber-200/[.04] p-4 text-sm leading-6 text-white/65">One navigable structure, with separate permissions for public discovery, private identity, family information and verified credentials.</div>
          </div>
        </div>
      </section>

      <section id="directory" className="mx-auto max-w-7xl px-5 py-20">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><div className="text-xs uppercase tracking-[.25em] text-amber-200">Explore Nigeria</div><h2 className="mt-3 font-display text-4xl md:text-5xl">The directory layers</h2><p className="mt-3 max-w-2xl text-white/55">Browse the hierarchy from state and LGA down to skills, portfolios and verified opportunities.</p></div>
          <div className="relative w-full md:max-w-sm"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search places, skills or pathways" className="w-full rounded-full border border-white/15 bg-white/[.04] py-3 pl-11 pr-4 text-sm outline-none focus:border-amber-200/60"/></div>
        </div>
        <div className="mt-8 flex flex-wrap gap-2">{["All pathways","Geography","Community","Family","Skills","Credentials"].map(x=><button key={x} onClick={()=>{setSelected(x);setQuery(x==="All pathways"?"":x==="Credentials"?"certification":x==="Geography"?"state":x==="Community"?"community":x==="Family"?"family":x==="Skills"?"skill":"")}} className={`rounded-full border px-4 py-2 text-xs transition ${selected===x?"border-amber-200 bg-amber-200/10 text-amber-100":"border-white/15 text-white/55 hover:border-white/35"}`}>{x}</button>)}</div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{filtered.map((item,i)=><article key={item.title} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-1 hover:border-amber-200/35"><div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-200/10 text-amber-200"><item.icon className="h-5 w-5"/></span><span className="text-xs text-white/25">0{i+1}</span></div><h3 className="mt-5 text-lg font-semibold">{item.title}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-white/55">{item.detail}</p><p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-amber-100/65">{item.examples}</p></article>)}</div>
        {filtered.length===0&&<p className="mt-8 rounded-2xl border border-white/10 p-8 text-center text-sm text-white/50">No matching pathway. Try a broader search.</p>}
      </section>

      <section id="pathways" className="border-y border-white/10 bg-white/[.02]">
        <div className="mx-auto max-w-7xl px-5 py-20"><div className="text-xs uppercase tracking-[.25em] text-amber-200">LordB2K orchestration model</div><h2 className="mt-3 font-display text-4xl md:text-5xl">From discovery to retention</h2><p className="mt-4 max-w-2xl text-white/55">A proposed lifecycle for routing people, applications, opportunities and follow-up through connected services.</p><div className="mt-10 grid gap-3 sm:grid-cols-3 lg:grid-cols-9">{lifecycle.map((step,i)=><div key={step} className="rounded-xl border border-white/10 bg-black/30 p-4"><div className="text-xs text-amber-200/60">0{i+1}</div><div className="mt-3 text-sm font-semibold">{step}</div></div>)}</div></div>
      </section>

      <section id="trust" className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-2">
        <div><div className="text-xs uppercase tracking-[.25em] text-amber-200">Privacy by design</div><h2 className="mt-3 font-display text-4xl">Trust is part of the architecture.</h2><p className="mt-4 leading-7 text-white/60">Family and genealogy features require explicit consent, scoped access, correction and removal workflows. Sensitive family connections must never be indexed as public directory data without a lawful basis and the relevant people's consent.</p></div>
        <div className="rounded-3xl border border-white/10 bg-white/[.035] p-7"><div className="flex items-center gap-3 text-amber-200"><ShieldCheck className="h-6 w-6"/><span className="font-semibold">Verification is a workflow, not a badge</span></div><ul className="mt-5 space-y-3 text-sm leading-6 text-white/60"><li>• Applications begin as submitted, not verified.</li><li>• Credentials require a named issuer and evidence.</li><li>• Shortlisting is not certification or employment.</li><li>• Delisted profiles retain an auditable status history.</li><li>• Private genealogy is separate from public portfolios.</li></ul></div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-xs text-white/35">© {new Date().getFullYear()} ResoFit Naija · Built for Nigeria · Powered by the ResoFit ecosystem</footer>
    </main>
  );
}
