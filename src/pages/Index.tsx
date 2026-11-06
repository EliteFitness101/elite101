import { Link } from "react-router-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import {
  Sparkles, Brain, Target, Calendar, CreditCard, Star, ArrowRight, Crown, Zap, MapPin,
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronLeft, ChevronRight, ArrowUpRight, CheckCircle2,
} from "lucide-react";


const heroClips = [
  { src: "/Create_livestream_setup_advertis…_20261017005430.mp4", title: "Livestream setup" },
  { src: "/Creating_advertisement_for_creat…_20261017004820.mp4", title: "Creator advertising" },
  { src: "/Creator_applying_for_streaming_role_20261017010020.mp4", title: "Apply to stream" },
  { src: "/Creator_filming_travel_content_20261017005213.mp4", title: "Creator lifestyle" },
  { src: "/Creators_joining_Elite_Ballers_p…_20261017005741.mp4", title: "Elite Ballers" },
  { src: "/Creators_preparing_for_professio…_20261017003431.mp4", title: "Professional creators" },
  { src: "/Livestream_host_recruitment_video_20261017005535.mp4", title: "Host recruitment" },
];


const EditorialCarousel = ({ children, label }: { children: ReactNode; label: string }) => {
  const rail = useRef<HTMLDivElement | null>(null);
  const move = (direction: number) => rail.current?.scrollBy({ left: direction * Math.max(280, rail.current.clientWidth * 0.78), behavior: "smooth" });
  return (
    <div>
      <div className="mb-4 flex justify-end gap-2">
        <button type="button" onClick={() => move(-1)} aria-label={`Scroll ${label} backward`} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white/75 transition hover:border-gold/50 hover:text-gold"><ChevronLeft className="h-4 w-4" /></button>
        <button type="button" onClick={() => move(1)} aria-label={`Scroll ${label} forward`} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white/75 transition hover:border-gold/50 hover:text-gold"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div ref={rail} aria-label={label} className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(200,169,106,.35)_transparent]">
        {children}
      </div>
    </div>
  );
};

const HeroVideoReel = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeClip, setActiveClip] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(33);
  const [motionAllowed, setMotionAllowed] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const smallScreen = window.matchMedia("(max-width: 767px)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const updatePlaybackPreference = () => setMotionAllowed(!reducedMotion.matches && !smallScreen.matches && !connection?.saveData);
    updatePlaybackPreference();
    reducedMotion.addEventListener("change", updatePlaybackPreference);
    smallScreen.addEventListener("change", updatePlaybackPreference);
    return () => {
      reducedMotion.removeEventListener("change", updatePlaybackPreference);
      smallScreen.removeEventListener("change", updatePlaybackPreference);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !motionAllowed) return;
    video.volume = volume / 100;
    video.muted = muted;
    if (!isPlaying) {
      video.pause();
      return;
    }
    const playback = video.play();
    if (playback) playback.catch(() => setIsPlaying(false));
  }, [activeClip, isPlaying, muted, volume, motionAllowed]);

  const moveClip = (direction: number) => {
    setActiveClip((current) => (current + direction + heroClips.length) % heroClips.length);
    setIsPlaying(true);
  };

  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(212,175,55,0.20),transparent_55%),linear-gradient(145deg,#08080b,#15130d_55%,#08080b)]" aria-label="Elite creator video reel">
      {motionAllowed && <video
        key={heroClips[activeClip].src}
        ref={videoRef}
        autoPlay
        muted={muted}
        loop={false}
        playsInline
        preload="metadata"
        onEnded={() => moveClip(1)}
        className="absolute inset-0 h-full w-full object-cover opacity-55"
        aria-label={heroClips[activeClip].title}
      >
        <source src={heroClips[activeClip].src} type="video/mp4" />
      </video>}
      <div className="absolute inset-0 bg-background/45" />
      <div className="absolute top-20 left-1/4 h-96 w-96 rounded-full bg-gold/20 blur-[120px] animate-pulse-glow pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 h-96 w-96 rounded-full bg-neon/10 blur-[120px] pointer-events-none" />

      {motionAllowed && <div className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 py-2 text-white shadow-xl backdrop-blur-xl">
        <span className="hidden sm:block max-w-32 truncate text-xs text-white/80" aria-live="polite">
          {activeClip + 1}/{heroClips.length} · {heroClips[activeClip].title}
        </span>
        <button type="button" onClick={() => moveClip(-1)} aria-label="Play previous clip" title="Previous clip" className="rounded-full p-2 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
          <SkipBack className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setIsPlaying((playing) => !playing)} aria-label={isPlaying ? "Pause video" : "Play video"} title={isPlaying ? "Pause" : "Play"} className="rounded-full p-2 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => moveClip(1)} aria-label="Play next clip" title="Next clip" className="rounded-full p-2 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
          <SkipForward className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Unmute video" : "Mute video"} title={muted ? "Unmute" : "Mute"} className="rounded-full p-2 hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
          {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <label className="flex items-center gap-1 text-[11px] text-white/80">
          <span>VOL</span>
          <input aria-label="Video volume" type="range" min="0" max="100" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="w-12 sm:w-16 accent-amber-300" />
          <span className="w-7 tabular-nums">{volume}%</span>
        </label>
      </div>}
    </div>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <HeroVideoReel />
        <div className="container relative z-10 py-24 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span className="text-xs tracking-wider uppercase text-muted-foreground">
              Africa-rooted • Built for the world
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] mb-6">
            Talent. <span className="text-gradient-luxe">Influence.</span>
            <br /> Opportunity. Without borders.
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            A creator and talent marketplace connecting exceptional people, brands and agencies —
            from Africa to the world. Build your profile, discover talent and grow your next opportunity.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-gold text-primary-foreground hover:opacity-90 glow-gold text-base h-12 px-8">
              <Link to="/auth?role=model&intent=become-model">
                For Creators <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-neon text-neon hover:bg-neon/10 text-base h-12 px-8">
              <Link to="/auth?role=brand&intent=book-talent">
                Find Talent <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-amber-300/70 text-amber-200 hover:bg-amber-300/10 text-base h-12 px-8">
              <Link to="/questionnaire">
                Become a Live Host <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-base h-12 px-8">
              <Link to="/explore">
                Explore Elite Media <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>


          {/* Luxury editorial photo carousel — concept imagery, not live member profiles */}
          <div className="mx-auto mt-16 max-w-6xl text-left">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div><p className="editorial-kicker mb-2">THE ELITE EDIT</p><h2 className="font-display text-3xl text-white sm:text-4xl">Find your next stage.</h2><p className="mt-2 max-w-xl text-sm text-white/55">Explore creator, talent and brand journeys through a more visual experience.</p></div>
              <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-[10px] uppercase tracking-[.18em] text-gold">Editorial concepts</span>
            </div>
            <EditorialCarousel label="Elite pathways">
              {[
                { image: "https://images.unsplash.com/photo-1737652423559-e193e9a5d3f9?auto=format&fit=crop&w=1000&q=85", title: "Creator & talent", kicker: "01 / DISCOVER", text: "Build a profile that puts your craft in front of opportunity.", to: "/auth?role=model&intent=become-model", cta: "Create your profile" },
                { image: "https://images.unsplash.com/photo-1669811860168-2c2874158dbd?auto=format&fit=crop&w=1000&q=85", title: "Brand partnerships", kicker: "02 / CONNECT", text: "Find distinctive talent and shape your next campaign.", to: "/auth?role=brand&intent=book-talent", cta: "Find talent" },
                { image: "https://images.unsplash.com/photo-1751048053312-73c620d69557?auto=format&fit=crop&w=1000&q=85", title: "Live creator pathways", kicker: "03 / GROW", text: "Explore live-host opportunities and guided onboarding.", to: "/pathways?intent=bigo", cta: "Explore live hosting" },
                { image: "https://images.unsplash.com/photo-1568116004495-ff4e6f952264?auto=format&fit=crop&w=1000&q=85", title: "Elite Media studio", kicker: "04 / CREATE", text: "Turn a clear brief into polished creator media and assets.", to: "/explore", cta: "Explore Elite Media" },
              ].map((item) => (
                <Link key={item.title} to={item.to} className="group editorial-card relative min-w-[78vw] max-w-[340px] snap-start sm:min-w-[300px]">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <img src={item.image} alt={item.title + " editorial concept"} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/5" />
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                      <p className="text-[10px] font-semibold tracking-[.22em] text-gold">{item.kicker}</p>
                      <h3 className="mt-2 font-display text-3xl text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/70">{item.text}</p>
                      <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/45 bg-black/35 px-4 py-2 text-xs font-semibold text-gold backdrop-blur-md">{item.cta}<ArrowUpRight className="h-3.5 w-3.5" /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </EditorialCarousel>
          </div>
        </div>
      </section>


      <section aria-label="Elite service highlights" className="overflow-hidden border-y border-gold/15 bg-white/[0.02] py-4">
        <div className="conversion-marquee-track flex w-max items-center gap-8 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[.22em] text-white/55">
          {Array.from({ length: 2 }).flatMap((_, copy) => ["Create with intention", "Discover exceptional talent", "Build your creator profile", "Launch a campaign", "Make every brief count", "Grow with ChatB2K"].map((word, index) => <span key={copy + "-" + index} className="inline-flex items-center gap-8"><span>{word}</span><span aria-hidden="true" className="text-gold">✦</span></span>))}
        </div>
      </section>
      {/* How it works */}
      <section id="how" className="container py-24">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">A clearer way to connect</div>
          <h2 className="font-display text-4xl md:text-5xl">
            Profile → Discovery → Match → Booking request → Agreed terms
          </h2>
        </div>
        <EditorialCarousel label="Creator journey steps">
          {[
            { icon: Crown, title: "Apply", desc: "Create your profile and share your work.", detail: "PROFILE" },
            { icon: Brain, title: "Review", desc: "Present your strengths for discovery and consideration.", detail: "ASSESSMENT" },
            { icon: Target, title: "Match", desc: "Explore relevant talent and campaign opportunities.", detail: "DISCOVERY" },
            { icon: Calendar, title: "Booking request", desc: "Discuss scope, availability, timing and agreed terms.", detail: "AGREEMENT" },
            { icon: CreditCard, title: "Secure checkout", desc: "Review the order details before authorizing payment.", detail: "CHECKOUT" },
          ].map((step, index) => (
            <article key={step.title} className="editorial-card min-w-[245px] max-w-[285px] snap-start p-6">
              <div className="mb-7 flex items-center justify-between"><span className="font-display text-5xl text-gold/45">0{index + 1}</span><step.icon className="h-6 w-6 text-gold" /></div>
              <p className="text-[10px] tracking-[.2em] text-gold">{step.detail}</p><h3 className="mt-2 font-display text-2xl">{step.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{step.desc}</p>
              {index < 4 && <div className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/35"><span className="h-px w-8 bg-gold/40" />Next step</div>}
            </article>
          ))}
        </EditorialCarousel>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-16">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-[0.3em] text-neon mb-3">Talent Tiers</div>
          <h2 className="font-display text-4xl">Four categories. One ResoFlex™ engine.</h2>
        </div>
        <EditorialCarousel label="Talent categories">
          {[
            { name: "Platinum", desc: "Editorial, luxury and high-fashion talent.", tag: "SIGNATURE" },
            { name: "Commercial", desc: "Versatile talent for brand-ready campaigns.", tag: "CAMPAIGNS" },
            { name: "Influencer", desc: "Social-first creators with a point of view.", tag: "SOCIAL" },
            { name: "Emerging", desc: "New talent building a professional portfolio.", tag: "NEXT WAVE" },
          ].map((category) => (
            <article key={category.name} className="editorial-card min-w-[230px] max-w-[280px] snap-start p-6">
              <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[9px] font-semibold tracking-[.2em] text-gold">{category.tag}</span>
              <h3 className="mt-8 font-display text-3xl">{category.name}</h3><p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">{category.desc}</p>
              <Link to="/marketplace" className="mt-7 inline-flex items-center gap-2 text-xs font-semibold text-gold">Explore marketplace <ArrowUpRight className="h-3.5 w-3.5" /></Link>
            </article>
          ))}
        </EditorialCarousel>
        </div>
      </section>

      {/* Why */}
      <section className="container py-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Brain,
              title: "Smarter discovery",
              desc: "Our ResoFlex™ vision engine scores photos, bio, and IG signals to surface the right talent — not the loudest.",
            },
            {
              icon: Zap,
              title: "Lightning bookings",
              desc: "Brands shortlist, book, and pay in one flow. Models get notified instantly.",
            },
            {
              icon: MapPin,
              title: "Africa-rooted. Globally minded.",
              desc: "Bring distinctive African creativity to a wider network of brands, campaigns and audiences.",
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


      {/* Journey directory */}
      <section className="container py-16">
        <div className="mb-8 max-w-3xl"><p className="editorial-kicker mb-3">ONE DESTINATION · CLEAR NEXT STEPS</p><h2 className="font-display text-4xl md:text-5xl">Choose a path. Keep moving.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">A quick guide to the right starting point. ChatB2K can help explain the steps, while applications and purchases remain in their dedicated flows.</p></div>
        <div className="overflow-x-auto rounded-2xl border border-gold/20 bg-white/[0.025]">
          <table className="w-full min-w-[660px] text-left text-sm">
            <thead className="border-b border-white/10 text-[10px] uppercase tracking-[.18em] text-gold"><tr><th className="p-4 font-semibold">Your goal</th><th className="p-4 font-semibold">Start here</th><th className="p-4 font-semibold">Next step</th><th className="p-4 font-semibold">Go</th></tr></thead>
            <tbody className="divide-y divide-white/[0.07]">
              {[
                ["Build a creator profile", "Creator application", "Create account · Complete profile", "/auth?role=model&intent=become-model"],
                ["Book talent for a campaign", "Brand workspace", "Create brief · Review matches", "/auth?role=brand&intent=book-talent"],
                ["Explore live hosting", "BIGO pathway", "Review requirements · Apply", "/pathways?intent=bigo"],
                ["Create or manage media", "Elite Media", "Compare offers · Choose a workflow", "/explore"],
              ].map((row) => <tr key={row[0]} className="text-white/65"><td className="p-4 font-medium text-white/85">{row[0]}</td><td className="p-4">{row[1]}</td><td className="p-4">{row[2]}</td><td className="p-4"><Link to={row[3]} className="inline-flex items-center gap-2 rounded-full border border-gold/35 px-3 py-2 text-xs font-semibold text-gold transition hover:bg-gold/10">Open <ArrowUpRight className="h-3 w-3" /></Link></td></tr>)}
            </tbody>
          </table>
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
            Join the next generation of African talent. Free to apply, ResoFlex™ scored in minutes.
          </p>
          <Button asChild size="lg" className="bg-gold text-primary-foreground hover:opacity-90 glow-gold h-12 px-10">
            <Link to="/auth?role=model">Start your application <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-gold/10 py-8">
        <div className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Elite NG. Africa-rooted, globally minded.
        </div>
      </footer>
    </div>
  );
};

export default Index;
