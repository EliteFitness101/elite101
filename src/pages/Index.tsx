import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import {
  Sparkles, Brain, Target, Calendar, CreditCard, Star, ArrowRight, Crown, Zap, MapPin,
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 h-96 w-96 rounded-full bg-gold/20 blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-10 right-1/4 h-96 w-96 rounded-full bg-neon/10 blur-[120px]" />
        </div>
        <div className="container py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="text-xs tracking-wider uppercase text-muted-foreground">
              ResoFlex™ Powered • Made for Africa
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] mb-6">
            Nigeria's <span className="text-gradient-luxe">elite</span>
            <br /> modeling marketplace
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Discover, score, and book Africa's top fashion, beauty, and influencer talent —
            powered by ResoFlex™. From discovery to payment in under 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-gold text-primary-foreground hover:opacity-90 glow-gold text-base h-12 px-8">
              <Link to="/auth?role=model">
                Become a Model <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-neon text-neon hover:bg-neon/10 text-base h-12 px-8">
              <Link to="/auth?role=brand">
                Book Talent <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mt-20">
            {[
              { value: "ResoFlex™", label: "Vision Scoring" },
              { value: "24h", label: "Avg Booking Time" },
              { value: "100%", label: "Secure Payments" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl py-5 px-3">
                <div className="font-display text-3xl text-gradient-gold">{s.value}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container py-24">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">The Workflow</div>
          <h2 className="font-display text-4xl md:text-5xl">
            Model → ResoFlex™ Score → Match → Booking → Payment
          </h2>
        </div>
        <div className="grid md:grid-cols-5 gap-4">
          {[
            { icon: Crown, title: "Apply", desc: "Models upload photos, bio, IG handle." },
            { icon: Brain, title: "ResoFlex™ Scout", desc: "Vision engine scores 0–100 and assigns category." },
            { icon: Target, title: "Match", desc: "Brands get ranked talent for each campaign." },
            { icon: Calendar, title: "Book", desc: "One-click booking with instant confirmation." },
            { icon: CreditCard, title: "Pay", desc: "Secure Paystack checkout. Models get paid." },
          ].map((s, i) => (
            <div
              key={s.title}
              className="glass rounded-2xl p-6 hover:border-gold transition-all hover:-translate-y-1"
            >
              <div className="font-display text-5xl text-gold/30 mb-2">0{i + 1}</div>
              <s.icon className="h-7 w-7 text-neon mb-3" />
              <h3 className="font-semibold mb-1">{s.title}</h3>
              <p className="text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container py-16">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-neon mb-3">Talent Tiers</div>
          <h2 className="font-display text-4xl">Four categories. One ResoFlex™ engine.</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "Platinum", desc: "Top-tier editorial & high fashion", color: "gold" },
            { name: "Commercial", desc: "Versatile, brand-ready talent", color: "neon" },
            { name: "Influencer", desc: "Social-first creators with reach", color: "gold" },
            { name: "Training", desc: "Emerging talent on the rise", color: "neon" },
          ].map((c) => (
            <div key={c.name} className="glass rounded-2xl p-6 text-center hover:scale-[1.02] transition">
              <Star className={`h-8 w-8 mx-auto mb-3 ${c.color === "gold" ? "text-gold" : "text-neon"}`} />
              <div className="font-display text-2xl mb-1">{c.name}</div>
              <p className="text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why */}
      <section className="container py-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Brain,
              title: "Smarter discovery",
              desc: "Our vision AI scores photos, bio, and IG signals to surface the right talent — not the loudest.",
            },
            {
              icon: Zap,
              title: "Lightning bookings",
              desc: "Brands shortlist, book, and pay in one flow. Models get notified instantly.",
            },
            {
              icon: MapPin,
              title: "Built for Nigeria",
              desc: "Lagos to Abuja to Port Harcourt — local talent, local payment, local rates.",
            },
          ].map((f) => (
            <div key={f.title} className="glass rounded-2xl p-7">
              <f.icon className="h-8 w-8 text-gold mb-4" />
              <h3 className="font-display text-xl mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="glass-strong rounded-3xl p-10 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 -z-10 animate-shimmer" />
          <h2 className="font-display text-4xl md:text-6xl mb-4">
            Ready to be <span className="text-gradient-gold">discovered?</span>
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join the next generation of African talent. Free to apply, AI-scored in minutes.
          </p>
          <Button asChild size="lg" className="bg-gold text-primary-foreground hover:opacity-90 glow-gold h-12 px-10">
            <Link to="/auth?role=model">Start your application <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-gold/10 py-8">
        <div className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Elite NG Modeling OS. Built in Lagos.
        </div>
      </footer>
    </div>
  );
};

export default Index;
