import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Radio, Search, Sparkles, Video, Trophy, UserRound,
  Compass, PlayCircle, MapPin, ShieldCheck, Zap, Heart, Loader2,
} from "lucide-react";

type Talent = {
  id: string;
  full_name: string;
  city: string | null;
  score: number | null;
  category: string | null;
  photoUrl: string;
};

const categories = [
  "For You", "Editorial", "Commercial", "Creators", "Live Hosts",
  "Wellness", "Counseling", "Fitness",
];

const LiveDiscover = () => {
  const [talent, setTalent] = useState<Talent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("For You");
  const [saved, setSaved] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("models_public")
          .select("id, full_name, city, score, category")
          .order("score", { ascending: false, nullsFirst: false })
          .limit(24);
        if (error) throw error;
        const rows = (data ?? []) as Omit<Talent, "photoUrl">[];
        const ids = rows.map((item) => item.id);
        const { data: photos } = ids.length
          ? await supabase.from("model_photos")
              .select("model_id, storage_path, position")
              .in("model_id", ids)
              .order("position", { ascending: true })
          : { data: [] as { model_id: string; storage_path: string; position: number }[] };
        const firstPhoto = new Map<string, string>();
        (photos ?? []).forEach((photo) => {
          if (!firstPhoto.has(photo.model_id)) firstPhoto.set(photo.model_id, photo.storage_path);
        });
        const results = await Promise.all(rows.map(async (item) => {
          const path = firstPhoto.get(item.id);
          let photoUrl = "";
          if (path) {
            const { data: signed } = await supabase.storage.from("model-photos").createSignedUrl(path, 1800);
            photoUrl = signed?.signedUrl ?? "";
          }
          return { ...item, photoUrl };
        }));
        if (active) setTalent(results);
      } catch (error) {
        console.error("Elite discover load failed", error);
        if (active) setTalent([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => talent.filter((item) => {
    const matchesQuery = !query || `${item.full_name} ${item.city ?? ""} ${item.category ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "For You" || item.category?.toLowerCase() === category.toLowerCase()
      || (category === "Creators" && ["influencer", "creator"].includes((item.category ?? "").toLowerCase()));
    return matchesQuery && matchesCategory;
  }), [talent, query, category]);

  const toggleSaved = (id: string) => setSaved((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);

  return (
    <div className="min-h-screen bg-background pb-28">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <section className="relative isolate mt-5 overflow-hidden rounded-[28px] border border-gold/20 bg-[#101014] px-5 py-8 sm:px-9 sm:py-12 md:py-16">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -right-12 -top-24 h-72 w-72 rounded-full bg-gold/20 blur-[100px]" />
            <div className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-emerald-400/10 blur-[100px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/20" />
          </div>
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-black/30 px-3 py-1.5 text-xs font-medium text-gold">
              <Sparkles className="h-3.5 w-3.5" /> ELITE NG · RESOFLEX SCOUT
            </div>
            <h1 className="font-display text-4xl leading-[1.02] sm:text-6xl md:text-7xl">
              Your next <span className="text-gradient-gold">breakthrough</span> starts here.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/70 sm:text-base">
              Discover bookable talent, build your creator profile, and prepare for live sessions, brand work and agency opportunities — all in one premium space.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 rounded-full bg-gold px-6 text-black hover:opacity-90">
                <Link to="/auth?role=model">Join as talent <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="h-12 rounded-full border-white/20 bg-white/5 px-6 text-white hover:bg-white/10">
                <Link to="/marketplace">Explore talent <Compass className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/60">
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-gold" /> Profile-led discovery</span>
              <span className="inline-flex items-center gap-1.5"><Zap className="h-4 w-4 text-gold" /> Mobile-first experience</span>
              <span className="inline-flex items-center gap-1.5"><Radio className="h-4 w-4 text-gold" /> Live tools rolling out</span>
            </div>
          </div>
          <div className="absolute bottom-5 right-6 hidden w-48 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-xl lg:block">
            <div className="flex items-center gap-2 text-xs text-white/60"><span className="h-2 w-2 rounded-full bg-gold" /> CREATOR JOURNEY</div>
            <div className="mt-3 flex items-center justify-between text-xs"><span>Profile</span><span className="text-gold">01</span></div>
            <div className="mt-2 h-1 rounded-full bg-white/10"><div className="h-1 w-1/3 rounded-full bg-gold" /></div>
            <div className="mt-3 text-xs text-white/60">Build your profile. Get discovered. Apply for opportunities.</div>
          </div>
        </section>

        <section className="pt-7" aria-label="Talent categories">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><p className="text-[10px] uppercase tracking-[0.25em] text-gold">Explore your lane</p><h2 className="mt-1 text-lg font-semibold">Find your scene</h2></div>
            <span className="text-xs text-muted-foreground">Swipe to explore →</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-3" role="group" aria-label="Filter talent category">
            {categories.map((item) => (
              <button key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-medium transition-all ${category === item ? "border-gold bg-gold text-black shadow-[0_0_24px_rgba(251,191,36,.15)]" : "border-white/10 bg-white/[0.03] text-white/70 hover:border-gold/40 hover:text-white"}`}>
                {item}
              </button>
            ))}
          </div>
        </section>

        <section className="pt-5">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-[10px] uppercase tracking-[0.25em] text-gold">Talent discovery</p><h2 className="mt-1 text-2xl font-semibold">People to know</h2><p className="mt-1 text-xs text-muted-foreground">Approved public profiles from the Elite marketplace.</p></div>
            <Link to="/marketplace" className="inline-flex items-center gap-1 text-xs text-gold hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
          <label className="mb-4 flex h-11 max-w-md items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 focus-within:border-gold/50">
            <Search className="h-4 w-4 text-white/40" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search talent, city or category" className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" aria-label="Search talent" />
          </label>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-gold" aria-label="Loading talent" /></div>
          ) : filtered.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {filtered.map((person) => (
                <article key={person.id} className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141419] transition duration-300 hover:-translate-y-1 hover:border-gold/40">
                  <Link to={`/models/${person.id}`} className="block">
                    <div className="relative aspect-[3/4] overflow-hidden bg-white/[0.04]">
                      {person.photoUrl ? <img src={person.photoUrl} alt={person.full_name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /> : <div className="flex h-full items-center justify-center"><UserRound className="h-10 w-10 text-white/20" /></div>}
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />
                      {person.score != null && <Badge className="absolute left-2 top-2 border border-gold/30 bg-black/60 text-gold backdrop-blur-md">Scout {person.score}</Badge>}
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="truncate font-semibold text-white">{person.full_name}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-white/65"><MapPin className="h-3 w-3" />{person.city || "Nigeria"}</p>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center justify-between gap-2 p-3">
                    <span className="truncate text-[10px] uppercase tracking-wider text-white/55">{person.category || "Emerging talent"}</span>
                    <button type="button" onClick={() => toggleSaved(person.id)} aria-label={saved.includes(person.id) ? `Unsave ${person.full_name}` : `Save ${person.full_name}`} aria-pressed={saved.includes(person.id)} className={`rounded-full p-2 transition ${saved.includes(person.id) ? "text-rose-400" : "text-white/40 hover:text-rose-300"}`}><Heart className={`h-4 w-4 ${saved.includes(person.id) ? "fill-current" : ""}`} /></button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.025] px-6 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-gold/20 bg-gold/5"><Search className="h-5 w-5 text-gold" /></div>
              <h3 className="mt-4 font-semibold">{talent.length ? "No matches for this filter" : "Your talent wall is warming up"}</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{talent.length ? "Try another category or search term." : "No public talent profiles are available to display yet. Create a profile or check back as talent is approved."}</p>
              <Button asChild className="mt-5 rounded-full bg-gold text-black hover:opacity-90"><Link to="/auth?role=model">Create your profile <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </div>
          )}
        </section>

        <section className="mt-10 overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-[#1b1710] via-[#111114] to-[#101014] p-6 sm:p-9">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="max-w-xl"><p className="text-[10px] uppercase tracking-[0.25em] text-gold">Your next move</p><h2 className="mt-2 font-display text-3xl sm:text-4xl">Turn your talent into opportunity.</h2><p className="mt-2 text-sm leading-6 text-white/60">Build a profile, showcase your strengths and apply for suitable work. Live broadcasting and virtual gifting require their own enabled integrations.</p></div>
            <Button asChild className="h-12 shrink-0 rounded-full bg-gold px-6 text-black hover:opacity-90"><Link to="/auth?role=model">Start onboarding <ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          </div>
        </section>
      </main>

      <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#101014]/90 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-2xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          <Link to="/live" aria-current="page" className="flex flex-col items-center gap-1 py-1.5 text-gold"><Compass className="h-5 w-5" /><span className="text-[10px] font-medium">Discover</span></Link>
          <Link to="/marketplace" className="flex flex-col items-center gap-1 py-1.5 text-white/55 hover:text-white"><Video className="h-5 w-5" /><span className="text-[10px]">Talent</span></Link>
          <Link to="/auth?role=model" className="flex flex-col items-center gap-1 py-1.5 text-white/55 hover:text-white"><span className="flex h-8 w-8 -translate-y-2 items-center justify-center rounded-full bg-gold text-black shadow-[0_0_22px_rgba(251,191,36,.25)]"><PlayCircle className="h-5 w-5" /></span><span className="-mt-2 text-[10px]">Join</span></Link>
          <Link to="/#tiers" className="flex flex-col items-center gap-1 py-1.5 text-white/55 hover:text-white"><Trophy className="h-5 w-5" /><span className="text-[10px]">Tiers</span></Link>
          <Link to="/auth" className="flex flex-col items-center gap-1 py-1.5 text-white/55 hover:text-white"><UserRound className="h-5 w-5" /><span className="text-[10px]">Profile</span></Link>
        </div>
      </nav>
    </div>
  );
};

export default LiveDiscover;
