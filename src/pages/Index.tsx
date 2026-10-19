import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import {
  Sparkles, Brain, Target, Calendar, CreditCard, Star, ArrowRight, Crown, Zap, MapPin,
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
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

const HeroVideoReel = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeClip, setActiveClip] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(33);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume / 100;
    video.muted = muted;
    if (!isPlaying) {
      video.pause();
      return;
    }
    const playback = video.play();
    if (playback) playback.catch(() => setIsPlaying(false));
  }, [activeClip, isPlaying, muted, volume]);

  const moveClip = (direction: number) => {
    setActiveClip((current) => (current + direction + heroClips.length) % heroClips.length);
    setIsPlaying(true);
  };

  return (
    <div className="absolute inset-0" aria-label="Elite creator video reel">
      <video
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
      </video>
      <div className="absolute inset-0 bg-background/55" />
      <div className="absolute top-20 left-1/4 h-96 w-96 rounded-full bg-gold/20 blur-[120px] animate-pulse-glow pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 h-96 w-96 rounded-full bg-neon/10 blur-[120px] pointer-events-none" />

      <div className="absolute bottom-3 left-1/2 z-20 flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-black/50 px-3 py-2 text-white shadow-xl backdrop-blur-xl">
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
      </div>
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
              ResoFlex™ Powered • Made for Africa
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] mb-6">
            Nigeria's <span className="text-gradient-luxe">elite</span>
            <br /> modeling marketplace
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Discover and book fashion, beauty, and creator talent through one streamlined marketplace —
            or build your creator profile to explore brand opportunities.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-gold text-primary-foreground hover:opacity-90 glow-gold text-base h-12 px-8">
              <Link to="/auth?role=model&intent=become-model">
                Become a Model <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-neon text-neon hover:bg-neon/10 text-base h-12 px-8">
              <Link to="/auth?role=brand&intent=book-talent">
                Book Talent <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-amber-300/70 text-amber-200 hover:bg-amber-300/10 text-base h-12 px-8">
              <Link to="/questionnaire">
                Apply as a BIGO Host <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>


          {/* Visual pathway cards: real media assets, not placeholder metric tiles */}
          <div className="mx-auto mt-16 grid max-w-5xl gap-4 text-left sm:grid-cols-3">
            {[
              { src: "/Creator_applying_for_streaming_role_20261017010020.mp4", title: "Build your profile", text: "Introduce your skills and creator interests.", to: "/auth?role=model&intent=become-model" },
              { src: "/Livestream_host_recruitment_video_20261017005535.mp4", title: "Explore live creator work", text: "Review the creator pathway and its requirements.", to: "/pathways?intent=bigo" },
              { src: "/Creator_filming_travel_content_20261017005213.mp4", title: "Find your next step", text: "Explore talent discovery and brand opportunities.", to: "/marketplace" },
            ].map((item) => (
              <Link key={item.title} to={item.to} className="group relative isolate min-h-64 overflow-hidden rounded-2xl border border-white/15 bg-black/50 text-left shadow-xl transition duration-300 hover:-translate-y-1 hover:border-gold/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
                <video autoPlay muted loop playsInline preload="metadata" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-65 transition duration-500 group-hover:scale-105">
                  <source src={item.src} type="video/mp4" />
                </video>
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black/55 to-black/5" />
                <div className="flex min-h-64 flex-col justify-end p-5 sm:p-6">
                  <div className="mb-2 text-xs uppercase tracking-[.2em] text-gold">Explore Elite</div>
                  <h3 className="font-display text-3xl text-white">{item.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-5 text-white/70">{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold">Explore pathway <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container py-24">
        <div className="text-center mb-16">
          <div className="text-xs uppercase tracking-[0.3em] text-gold mb-3">The Workflow</div>
          <h2 className="font-display text-4xl md:text-5xl">
            Profile → Discovery → Match → Booking request → Agreed terms
          </h2>
        </div>
        <div className="grid md:grid-cols-5 gap-4">
          {[
            { icon: Crown, title: "Apply", desc: "Models upload photos, bio, IG handle." },
            { icon: Brain, title: "Profile review", desc: "Present your profile clearly for discovery and consideration." },
            { icon: Target, title: "Match", desc: "Brands get ranked talent for each campaign." },
            { icon: Calendar, title: "Booking request", desc: "Discuss scope, availability, timing, and agreed terms." },
            { icon: CreditCard, title: "Payment", desc: "Use the available checkout and confirm payment terms before proceeding." },
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
              desc: "Our ResoFlex™ vision engine scores photos, bio, and IG signals to surface the right talent — not the loudest.",
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
            Join the next generation of African talent. Free to apply, ResoFlex™ scored in minutes.
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
