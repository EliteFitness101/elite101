import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import {
  Sparkles, Brain, Target, Calendar, CreditCard, Star, ArrowRight, Crown, Zap, MapPin, ShieldCheck, Users,
} from "lucide-react";

const Index = () => {
  const workflow = [
    { icon: Crown, title: "Create a profile", desc: "Present your look, experience, portfolio and availability." },
    { icon: Brain, title: "Build your profile signal", desc: "ResoFlex™ scoring is positioned to help structure talent discovery." },
    { icon: Target, title: "Discover a match", desc: "Explore talent and campaign needs in one marketplace." },
    { icon: Calendar, title: "Align the booking", desc: "Review campaign details and coordinate next steps." },
    { icon: CreditCard, title: "Continue to checkout", desc: "Follow the available booking and payment flow before committing." },
  ];
  const categories = [
    { name: "Platinum", desc: "Editorial, runway and high-fashion opportunities", tone: "gold" },
    { name: "Commercial", desc: "Versatile talent for brand campaigns", tone: "rose" },
    { name: "Influencer", desc: "Creators for social-first storytelling", tone: "gold" },
    { name: "Emerging", desc: "New talent building a professional portfolio", tone: "rose" },
  ];

  return (
    <div className="min-h-screen overflow-x-clip">
      <Navbar />
      <main>
        <section className="relative isolate overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-16 left-[10%] h-72 w-72 rounded-full bg-gold/20 blur-[100px] sm:h-96 sm:w-96" />
            <div className="absolute right-[4%] top-1/3 h-72 w-72 rounded-full bg-neon/10 blur-[110px] sm:h-96 sm:w-96" />
            <div className="absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-amethyst/10 blur-[100px]" />
          </div>
          <div className="container py-16 text-center sm:py-24 md:py-32">
            <div className="mx-auto mb-7 inline-flex max-w-full items-center gap-2 rounded-full border border-gold/20 bg-background/60 px-4 py-2 text-left backdrop-blur">
              <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0 text-gold" />
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground sm:text-sm">
                ResoFlex™ powered · Made for Africa
              </span>
            </div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-neon">Talent. Campaigns. Opportunity.</p>
            <h1 className="mx-auto mb-6 max-w-5xl font-display text-5xl leading-[0.96] sm:text-6xl md:text-7xl lg:text-8xl">
              Nigeria’s <span className="text-gradient-luxe">elite</span><br />
              modeling marketplace
            </h1>
            <p className="mx-auto mb-9 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg md:text-xl">
              Discover fashion, beauty and influencer talent. Build a professional profile, explore campaign opportunities and connect through a marketplace designed for African talent.
            </p>
            <div className="mx-auto flex w-full max-w-xl flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-h-12 w-full bg-gold px-7 text-base text-primary-foreground glow-gold hover:opacity-90 sm:w-auto">
                <Link to="/auth?role=model">Join as a model <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-12 w-full border-neon px-7 text-base text-neon hover:bg-neon/10 sm:w-auto">
                <Link to="/auth?role=brand">Find talent <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-3 text-left sm:mt-16 sm:grid-cols-3 sm:gap-4">
              {[
                { icon: Brain, value: "ResoFlex™", label: "Structured talent discovery" },
                { icon: Users, value: "Two-sided", label: "Model and brand journeys" },
                { icon: ShieldCheck, value: "Clear steps", label: "Review before you commit" },
              ].map((item) => (
                <div key={item.label} className="glass flex items-center gap-4 rounded-2xl p-4 sm:block sm:p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 sm:mb-4">
                    <item.icon aria-hidden="true" className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <div className="font-display text-2xl text-gradient-gold sm:text-3xl">{item.value}</div>
                    <div className="mt-1 text-sm leading-5 text-muted-foreground">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="container scroll-mt-24 py-16 sm:py-20 md:py-24">
          <div className="mx-auto mb-10 max-w-3xl text-center sm:mb-14">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-gold">How it works</div>
            <h2 className="font-display text-3xl leading-tight sm:text-4xl md:text-5xl">A clearer path from discovery to booking</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base">A simple journey for talent and brands, with the next step visible at each stage.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
            {workflow.map((step, i) => (
              <article key={step.title} className="glass group rounded-2xl p-5 transition duration-200 hover:-translate-y-1 hover:border-gold/40 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-display text-4xl text-gold/50">0{i + 1}</span>
                  <step.icon aria-hidden="true" className="h-6 w-6 text-neon" />
                </div>
                <h3 className="mb-2 font-semibold">{step.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{step.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="container py-12 sm:py-16">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-neon">Talent pathways</div>
            <h2 className="font-display text-3xl sm:text-4xl">Find the right fit for the brief</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Explore different talent profiles without implying a guaranteed booking or outcome.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <article key={category.name} className="glass rounded-2xl p-6 transition hover:border-gold/40">
                <Star aria-hidden="true" className={`mb-4 h-7 w-7 ${category.tone === "gold" ? "text-gold" : "text-neon"}`} />
                <h3 className="mb-2 font-display text-2xl">{category.name}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{category.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="container py-12 sm:py-20">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Brain, title: "Discovery with context", desc: "Present profile details and campaign needs in a more structured way." },
              { icon: Zap, title: "A focused booking journey", desc: "Keep profile discovery, campaign intent and booking steps connected." },
              { icon: MapPin, title: "Built with African talent in mind", desc: "A marketplace concept shaped around local talent and brand opportunities." },
            ].map((feature) => (
              <article key={feature.title} className="glass rounded-2xl p-6 sm:p-7">
                <feature.icon aria-hidden="true" className="mb-4 h-7 w-7 text-gold" />
                <h3 className="mb-2 font-display text-xl sm:text-2xl">{feature.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{feature.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="container pb-16 sm:pb-24">
          <div className="glass-strong relative isolate overflow-hidden rounded-3xl p-6 text-center sm:p-10 md:p-16">
            <div aria-hidden="true" className="absolute inset-0 -z-10 animate-shimmer opacity-50" />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/30 bg-gold/10">
              <Sparkles aria-hidden="true" className="h-6 w-6 text-gold" />
            </div>
            <h2 className="mx-auto mb-4 max-w-3xl font-display text-3xl sm:text-4xl md:text-6xl">Make your next opportunity count.</h2>
            <p className="mx-auto mb-7 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">Create a model profile or join as a brand to start exploring the Elite NG marketplace.</p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="min-h-12 bg-gold px-8 text-primary-foreground glow-gold hover:opacity-90">
                <Link to="/auth?role=model">Create a model profile <ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="min-h-12 border-gold/40 px-8 hover:bg-gold/10">
                <Link to="/auth?role=brand">Join as a brand</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-gold/10">
        <div className="container flex flex-col gap-4 py-6 text-center text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>© {new Date().getFullYear()} Elite NG · ResoFlex™ powered</span>
          <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-x-5 gap-y-2 sm:justify-end">
            <Link className="min-h-11 inline-flex items-center hover:text-foreground" to="/marketplace">Explore talent</Link>
            <Link className="min-h-11 inline-flex items-center hover:text-foreground" to="/auth">Sign in</Link>
            <a className="min-h-11 inline-flex items-center hover:text-foreground" href="/#how">How it works</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Index;
