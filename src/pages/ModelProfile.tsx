import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Instagram } from "lucide-react";

const ModelProfile = () => {
  const { id } = useParams();
  const [model, setModel] = useState<any>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await (supabase as any).from("models_public").select("*").eq("id", id).maybeSingle();
      setModel(data);
      if (data) {
        const { data: ph } = await supabase
          .from("model_photos").select("storage_path, position").eq("model_id", id).order("position", { ascending: true });
        if (ph?.length) {
          const urls = await Promise.all(
            ph.map(async (p: any) => {
              const { data: s } = await supabase.storage.from("model-photos").createSignedUrl(p.storage_path, 3600);
              return s?.signedUrl ?? "";
            })
          );
          setPhotos(urls.filter(Boolean));
        }
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="min-h-screen"><Navbar /><div className="container py-20 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div></div>;
  if (!model) return <div className="min-h-screen"><Navbar /><div className="container py-20 text-center text-muted-foreground">Model not found</div></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container py-10 grid md:grid-cols-3 gap-6">
        <section className="md:col-span-2 min-w-0 space-y-3" aria-label="Talent portfolio">
          {photos.length > 0 ? (
            <>
              <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-3 [scrollbar-width:thin] [scrollbar-color:rgba(200,169,106,.45)_transparent]" role="region" aria-label="Swipe through portfolio photos" tabIndex={0}>
                {photos.map((url, index) => (
                  <figure key={url} className="w-[82vw] max-w-[620px] shrink-0 snap-center overflow-hidden rounded-3xl border border-gold/15 bg-black/30">
                    <img src={url} alt={index === 0 ? `${model.full_name} portfolio` : `${model.full_name} portfolio image ${index + 1}`} className="aspect-[4/5] w-full object-cover" loading={index === 0 ? "eager" : "lazy"} />
                    <figcaption className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
                      <span>Portfolio image {index + 1}</span>
                      <span className="tabular-nums">{index + 1} / {photos.length}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Swipe to explore the portfolio.</p>
            </>
          ) : (
            <div className="glass-strong grid min-h-[320px] place-items-center rounded-3xl border border-gold/15 p-8 text-center">
              <div><div className="font-display text-2xl text-gradient-gold">Portfolio</div><p className="mt-2 text-sm text-muted-foreground">Portfolio photos will appear here when available.</p></div>
            </div>
          )}
        </section>
        <div className="space-y-4">
          <div>
            <h1 className="font-display text-4xl">{model.full_name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {model.category && <Badge variant="outline">{model.category}</Badge>}
              {model.score != null && <Badge variant="outline" className="border-gold text-gold">Score {model.score}</Badge>}
            </div>
            <div className="text-sm text-muted-foreground mt-3 space-y-1">
              {model.city && <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{model.city}, {model.state}</div>}
              {model.instagram && <div className="flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5" />@{model.instagram}</div>}
            </div>
          </div>
          {model.bio && (
            <div className="glass rounded-2xl p-4">
              <div className="text-xs uppercase tracking-wider text-gold mb-2">About</div>
              <p className="text-sm">{model.bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelProfile;
