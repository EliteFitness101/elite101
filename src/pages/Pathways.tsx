import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, Briefcase, GraduationCap, Laptop, Radio, ShieldCheck, ShoppingBag, Sparkles, Wallet } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const media = [
  { src: "/Creator_applying_for_streaming_role_20261017010020.mp4", label: "Creator opportunities" },
  { src: "/Creator_filming_travel_content_20261017005213.mp4", label: "Creator lifestyle" },
  { src: "/Livestream_host_recruitment_video_20261017005535.mp4", label: "Live host pathway" },
];

const pathways: Record<string, {
  eyebrow: string; title: string; accent: string; description: string; icon: typeof Radio;
  benefits: string[]; intent: string; primary: string; disclaimer?: string;
}> = {
  bigo: {
    eyebrow: "LIVE CREATOR PATHWAY", title: "Take your presence live.", accent: "BIGO Live",
    description: "Explore live-streaming as a creator. Build your profile first, understand platform requirements, and use BIGO's official service for account access and live-streaming actions.",
    icon: Radio, benefits: ["Creator profile and interest capture", "A clear next step into the official BIGO platform", "No promise of audience size, gifts, or income"],
    intent: "start-earning", primary: "Build my creator profile",
  },
  "start-earning": {
    eyebrow: "CREATOR OPPORTUNITIES", title: "Turn your skills into opportunities.", accent: "On your terms.",
    description: "Start with a creator profile, highlight your strengths, and explore relevant opportunities. Work, selection, and income depend on eligibility, demand, and individual results.",
    icon: Briefcase, benefits: ["Create a profile for discovery", "Explore brand and creator opportunities", "Keep your next step clear from mobile"],
    intent: "start-earning", primary: "Start my profile",
  },
  "earn-from-home": {
    eyebrow: "FLEXIBLE CREATOR WORK", title: "Explore work from wherever you are.", accent: "Build with intention.",
    description: "See whether creator work fits your schedule, skills, and equipment. Start with a profile and review opportunities before committing time or money.",
    icon: Laptop, benefits: ["Mobile-first profile setup", "Understand the opportunity before you commit", "No guaranteed earnings or hours promised"],
    intent: "earn-from-home", primary: "Explore opportunities",
  },
  "work-from-home": {
    eyebrow: "REMOTE OPPORTUNITIES", title: "Your next opportunity starts with a profile.", accent: "Work from home.",
    description: "Introduce your experience and interests so the right pathway can be explored. Availability and selection depend on current opportunities and their requirements.",
    icon: Laptop, benefits: ["Share your skills and interests", "Explore creator and talent pathways", "Review requirements before applying"],
    intent: "work-from-home", primary: "Create my profile",
  },
  "student-support": {
    eyebrow: "STUDENT SUPPORT ENQUIRY", title: "Make room for your next step.", accent: "Start with an enquiry.",
    description: "Register your interest in student support and review any eligibility, terms, and required documentation before making a decision.",
    icon: GraduationCap, benefits: ["Register an enquiry", "Get the pathway and requirements clarified", "No support award or approval is implied"],
    intent: "student-support", primary: "Register interest",
    disclaimer: "This is an enquiry route only. Support availability, eligibility, amount, timing, and approval are not guaranteed. Never pay an unofficial fee to secure approval.",
  },
  "soft-loan-enquiry": {
    eyebrow: "FINANCIAL SUPPORT ENQUIRY", title: "Understand the terms before you decide.", accent: "Ask first. Decide clearly.",
    description: "Use this page to register interest in a possible soft-loan pathway. Review the provider, eligibility, repayment terms, fees, and written agreement before accepting any offer.",
    icon: Wallet, benefits: ["Register an enquiry rather than an application promise", "Check the provider and written terms", "Compare repayment obligations before deciding"],
    intent: "soft-loan-enquiry", primary: "Register a loan enquiry",
    disclaimer: "No loan, funding, or approval is guaranteed. Do not submit money or sensitive financial credentials to unverified parties. Confirm the actual provider and written terms independently.",
  },
};

const Pathways = () => {
  const [params] = useSearchParams();
  const key = params.get("intent") ?? "start-earning";
  const item = pathways[key] ?? pathways["start-earning"];
  const Icon = item.icon;

  return (
    <main className="min-h-screen overflow-hidden">
      <Navbar />
      <section className="relative isolate border-b border-white/10">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_12%_20%,hsl(46_65%_52%/0.18),transparent_38%),radial-gradient(ellipse_at_88%_78%,hsl(152_100%_50%/0.10),transparent_35%)]" />
        <div className="container grid min-h-[620px] items-center gap-10 py-14 md:grid-cols-[1.05fr_.95fr] md:py-20">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[.22em] text-gold backdrop-blur-xl">
              <Sparkles className="h-4 w-4" /> {item.eyebrow}
            </div>
            <p className="mb-2 font-display text-2xl tracking-wide text-white/60">{item.accent}</p>
            <h1 className="font-display text-5xl leading-[.98] text-white sm:text-6xl lg:text-7xl">{item.title}</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-white/70 sm:text-lg">{item.description}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-full bg-gold px-7 text-base text-black hover:bg-amber-300">
                <Link to={`/auth?role=model&intent=${encodeURIComponent(item.intent)}`}>{item.primary}<ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              {key === "bigo" ? (
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/20 bg-white/[0.04] px-7 text-white hover:bg-white/10">
                  <a href="https://www.bigo.tv/" target="_blank" rel="noreferrer">Open official BIGO <ArrowRight className="ml-2 h-4 w-4" /></a>
                </Button>
              ) : (
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full border-white/20 bg-white/[0.04] px-7 text-white hover:bg-white/10">
                  <Link to="/marketplace">Explore talent marketplace</Link>
                </Button>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/55">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold" /> Clear next steps</span>
              <span className="inline-flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-gold" /> No unsupported guarantees</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2rem] bg-gold/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[1.8rem] border border-white/15 bg-black/50 p-2 shadow-2xl backdrop-blur-2xl">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem] bg-neutral-950">
                <video key={media[key === "bigo" ? 2 : key === "student-support" || key === "soft-loan-enquiry" ? 1 : 0].src} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover opacity-80">
                  <source src={media[key === "bigo" ? 2 : key === "student-support" || key === "soft-loan-enquiry" ? 1 : 0].src} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-black/5" />
                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-black/50 p-4 backdrop-blur-xl sm:inset-x-5 sm:bottom-5 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-gold"><Icon className="h-5 w-5" /></div>
                    <div><p className="font-semibold text-white">Your next step, made clear</p><p className="mt-1 text-sm leading-5 text-white/65">One focused pathway. Transparent expectations. A mobile-ready start.</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-14 md:py-20">
        <div className="mb-8 max-w-2xl">
          <p className="text-xs uppercase tracking-[.25em] text-gold">A considered journey</p>
          <h2 className="mt-3 font-display text-4xl text-white sm:text-5xl">Clarity before commitment.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">Explore the steps, understand the requirements, and choose when you are ready.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {item.benefits.map((benefit, i) => (
            <article key={benefit} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-6 backdrop-blur-2xl transition duration-300 hover:-translate-y-1 hover:border-gold/35 hover:bg-white/[0.06]">
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-gold/25 bg-gold/10 text-gold"><Icon className="h-5 w-5" /></div>
              <p className="mb-2 text-xs uppercase tracking-[.2em] text-gold/75">Step 0{i + 1}</p>
              <h3 className="text-lg font-semibold leading-6 text-white">{benefit}</h3>
            </article>
          ))}
        </div>
        {item.disclaimer && <div role="note" className="mt-6 rounded-2xl border border-amber-200/20 bg-amber-100/[0.045] p-5 text-sm leading-6 text-white/70"><strong className="text-amber-200">Important:</strong> {item.disclaimer}</div>}
        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-3xl border border-gold/20 bg-gradient-to-r from-gold/[0.10] via-white/[0.035] to-transparent p-6 backdrop-blur-xl sm:flex-row sm:items-center sm:p-8">
          <div><h2 className="font-display text-3xl text-white sm:text-4xl">Ready to take the next step?</h2><p className="mt-2 text-sm text-white/60">Start with the profile or enquiry. You can review the details before committing.</p></div>
          <Button asChild size="lg" className="shrink-0 rounded-full bg-gold px-7 text-black hover:bg-amber-300"><Link to={`/auth?role=model&intent=${encodeURIComponent(item.intent)}`}>Continue securely <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
        </div>
      </section>
      <footer className="border-t border-white/10 py-7 text-center text-xs text-white/45">ELITE NG · ResoFlex™ powered talent marketplace · <Link className="underline underline-offset-4 hover:text-gold" to="/marketplace">Marketplace</Link> · <a className="underline underline-offset-4 hover:text-gold" href="https://shop.resofit.fit/" target="_blank" rel="noreferrer">ResoFit Shop</a></footer>
    </main>
  );
};

export default Pathways;
