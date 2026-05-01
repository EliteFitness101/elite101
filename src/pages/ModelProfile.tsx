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
      const { data } = await supabase.from("models").select("*, model_photos(storage_path, position)").eq("id", id).maybeSingle();
      setModel(data);
      if (data?.model_photos?.length) {
        const sorted = [...data.model_photos].sort((a: any, b: any) => a.position - b.position);
        const urls = await Promise.all(
          sorted.map(async (p: any) => {
            const { data: s } = await supabase.storage.from("model-photos").createSignedUrl(p.storage_path, 3600);
            return s?.signedUrl ?? "";
          })
        );
        setPhotos(urls.filter(Boolean));
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
        <div className="md:col-span-2 space-y-3">
          {photos[0] && <img src={photos[0]} alt={model.full_name} className="w-full rounded-3xl object-cover aspect-[4/5]" />}
          {photos.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(1).map((u, i) => <img key={i} src={u} className="aspect-square object-cover rounded-xl" alt="" />)}
            </div>
          )}
        </div>
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
          {model.ai_reasoning && (
            <div className="glass rounded-2xl p-4">
              <div className="text-xs uppercase tracking-wider text-neon mb-2">AI insights</div>
              <p className="text-sm text-muted-foreground">{model.ai_reasoning}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelProfile;
