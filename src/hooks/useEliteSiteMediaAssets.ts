import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SiteAsset = { id: string; src: string; title: string; alt: string; updated_at: string };
type SiteAssets = Record<string, SiteAsset>;

export function useEliteSiteMediaAssets() {
  const [assets, setAssets] = useState<SiteAssets>({});
  useEffect(() => {
    let active = true;
    supabase.functions.invoke("elite-media-site-assets", { method: "GET" })
      .then(({ data, error }) => {
        if (!active || error || !data?.ok || !data.assets) return;
        setAssets(data.assets as SiteAssets);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);
  return assets;
}
