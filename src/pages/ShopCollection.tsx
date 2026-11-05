import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeCheck, LockKeyhole, PackageCheck, ShoppingBag, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ManifestItem = {
  kind: "first_party_product" | "external_candidate" | "elite_service" | string;
  sku?: string;
  title?: string;
  status?: string;
  purchase_enabled?: boolean;
  inventory_freshness_required?: boolean;
  fulfillment_mode?: string;
  service_slug?: string;
  href?: string;
  external_product_id?: string;
  price_visibility?: string;
  source_category_url?: string;
  inventory_freshness_required?: boolean;
  [key: string]: unknown;
};

type CatalogProduct = {
  id: string;
  published?: boolean;
  sku: string;
  handle: string;
  title: string;
  vendor?: string | null;
  product_type?: string | null;
  variant_price: number;
  fulfillment_mode?: string | null;
  image_src?: string | null;
  body_html?: string | null;
};

type ResolvedItem = { manifest: ManifestItem; product?: CatalogProduct | null };
type CollectionPage = {
  status: string;
  version: number;
  canonical_path: string;
  manifest?: { title?: string; description?: string; filters?: string[]; items?: ManifestItem[] };
  seo?: { title?: string; description?: string };
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function catalogGet<T>(path: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("The catalogue connection is not configured.");
  const response = await fetch(`${SUPABASE_URL}/functions/v1/catalog-public/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: "application/json" },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : "Catalogue request failed.");
  return body as T;
}

const formatNgn = (value: number) => new Intl.NumberFormat("en-NG", {
  style: "currency", currency: "NGN", maximumFractionDigits: 0,
}).format(value);

export default function ShopCollection() {
  const { slug = "" } = useParams();
  const [collection, setCollection] = useState<CollectionPage | null>(null);
  const [items, setItems] = useState<ResolvedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    setCollection(null);
    setItems([]);
    setCart({});
    void (async () => {
      try {
        const result = await catalogGet<{ data?: CollectionPage[] }>(`collections?slug=${encodeURIComponent(slug)}`);
        const page = (result.data ?? []).find((entry) => entry.status === "published");
        if (!page) throw new Error("This collection is not published yet.");
        const manifestItems: ManifestItem[] = Array.isArray(page.manifest?.items) ? page.manifest.items : [];
        const resolved = await Promise.all(manifestItems.map(async (item) => {
          if (item.kind !== "first_party_product" || !item.sku) return { manifest: item };
          try {
            const productResult = await catalogGet<{ data?: CatalogProduct }>(`product?sku=${encodeURIComponent(item.sku)}`);
            return { manifest: item, product: productResult.data ?? null };
          } catch {
            return { manifest: item, product: null };
          }
        }));
        if (!active) return;
        setCollection(page);
        setItems(resolved);
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : "Collection could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  const cartLines = useMemo(() => Object.entries(cart).flatMap(([sku, quantity]) => {
    const item = items.find((entry) => entry.product?.sku === sku);
    return item?.product ? [{ sku, quantity, product: item.product }] : [];
  }), [cart, items]);
  const total = cartLines.reduce((sum, line) => sum + Number(line.product.variant_price || 0) * line.quantity, 0);
  const requiresAddress = cartLines.some((line) => ["physical", "hybrid"].includes(String(line.product.fulfillment_mode).toLowerCase()));

  function addToCart(product: CatalogProduct) {
    setCart((current) => ({ ...current, [product.sku]: Math.min(100, (current[product.sku] ?? 0) + 1) }));
    setCheckoutError("");
  }

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCheckoutError("");
    if (!cartLines.length) return;
    setCheckoutBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-init", {
        body: {
          items: cartLines.map(({ sku, quantity }) => ({ sku, quantity })),
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          address: requiresAddress ? address.trim() : "",
          funnel_origin: "elite101_hybrid_collection",
          campaign: slug,
          utm_source: "elite101",
          utm_medium: "hybrid_collection",
        },
      });
      if (error || !data?.authorization_url) {
        throw new Error(data?.error || error?.message || "ResoFit checkout could not be prepared.");
      }
      window.location.assign(data.authorization_url);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Checkout could not be prepared.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  const title = collection?.manifest?.title || collection?.seo?.title || "ResoFit Collection";
  const description = collection?.manifest?.description || collection?.seo?.description || "";
  const filterLabels: string[] = Array.isArray(collection?.manifest?.filters) ? collection.manifest.filters : [];

  return (
    <main className="elite-page min-h-screen overflow-hidden text-white">
      <Navbar />
      <div className="elite-atmosphere" aria-hidden="true"><span /><span /><span /></div>
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/monetization" className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to Elite
        </Link>

        {loading ? (
          <div className="py-24 text-center text-sm text-white/55">Loading collection…</div>
        ) : loadError ? (
          <section className="elite-glass mx-auto mt-14 max-w-2xl rounded-3xl p-8 text-center sm:p-12">
            <LockKeyhole className="mx-auto h-9 w-9 text-[#e9c979]" />
            <p className="elite-kicker mt-5">COLLECTION STATUS</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Collection not available</h1>
            <p className="mt-3 text-sm leading-7 text-white/60">{loadError}</p>
            <Link to="/monetization" className="mt-7 inline-flex items-center gap-2 text-sm text-[#f4d58b]">
              Explore Elite services <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <>
            <header className="mt-10 max-w-4xl">
              <p className="elite-kicker">RESOFIT × RESOFLEX × ELITE NG</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-white/60">{description}</p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65">Canonical collection</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65">NGN first-party checkout</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/65">Supplier verification enforced</span>
              </div>
            </header>

            {filterLabels.length > 0 && (
              <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                  <Sparkles className="h-4 w-4 text-[#e9c979]" /> Catalogue facets
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {filterLabels.map((filter) => (
                    <span key={filter} className="rounded-full border border-white/10 px-3 py-1 text-xs capitalize text-white/55">
                      {filter.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((entry, index) => {
                const item = entry.manifest;
                if (item.kind === "elite_service") {
                  return (
                    <article key={item.service_slug || index} className="elite-glass rounded-3xl p-6">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#e9c979]">
                        <Sparkles className="h-4 w-4" /> Elite101 service
                      </div>
                      <h2 className="mt-4 text-xl font-semibold">{item.title || "Elite creator service"}</h2>
                      <p className="mt-2 text-sm leading-6 text-white/55">Separate Elite101 checkout and service terms apply; this is not combined with the ResoFit Paystack cart.</p>
                      <Link to={String(item.href || "/monetization")} className="mt-6 inline-flex items-center gap-2 text-sm text-[#f4d58b]">
                        View service <ArrowRight className="h-4 w-4" />
                      </Link>
                    </article>
                  );
                }
                if (item.kind === "external_candidate") {
                  return (
                    <article key={item.external_product_id || index} className="elite-glass rounded-3xl p-6">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
                        <LockKeyhole className="h-4 w-4" /> Supplier verification pending
                      </div>
                      <h2 className="mt-4 text-xl font-semibold">{item.title || "External supplier candidate"}</h2>
                      <p className="mt-2 text-sm leading-6 text-white/55">Direct product page, seller, current price, stock, resale permission and delivery terms are not verified. This item is not purchasable.</p>
                      <span className="mt-5 inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/45">Not available for checkout</span>
                    </article>
                  );
                }
                const product = entry.product;
                const productMode = String(product?.fulfillment_mode || item.fulfillment_mode || "").toLowerCase();
                const canBuy = Boolean(item.purchase_enabled && product?.published && product?.variant_price > 0 && ["digital", "physical", "hybrid", "service"].includes(productMode));
                return (
                  <article key={item.sku || index} className="elite-glass overflow-hidden rounded-3xl">
                    {product?.image_src ? (
                      <img src={product.image_src} alt={product.title} className="aspect-[16/10] w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex aspect-[16/10] items-center justify-center bg-white/[0.03]"><PackageCheck className="h-8 w-8 text-white/20" /></div>
                    )}
                    <div className="p-6">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
                        <BadgeCheck className="h-4 w-4 text-[#e9c979]" /> ResoFit first-party
                      </div>
                      <h2 className="mt-3 text-xl font-semibold">{product?.title || item.title || "Catalogue item"}</h2>
                      {product ? <p className="mt-2 text-sm text-white/55">{formatNgn(Number(product.variant_price || 0))} · {product.fulfillment_mode || item.fulfillment_mode || "classified"}</p> : <p className="mt-2 text-sm text-white/45">Product is not currently published in the canonical catalogue.</p>}
                      {canBuy ? (
                        <Button onClick={() => { if (product) addToCart(product); }} className="mt-5 w-full rounded-full bg-[#e9c979] text-[#15130e] hover:bg-[#f3d992]">
                          <ShoppingBag className="mr-2 h-4 w-4" /> Add to ResoFit checkout
                        </Button>
                      ) : (
                        <span className="mt-5 inline-flex rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/45">
                          {item.inventory_freshness_required ? "Inventory refresh required" : "Not currently purchasable"}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>

            {cartLines.length > 0 && (
              <section className="elite-glass mt-10 rounded-3xl p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="elite-kicker">RESOFIT SECURE CHECKOUT</p>
                    <h2 className="mt-2 text-2xl font-semibold">Your first-party collection cart</h2>
                  </div>
                  <p className="text-xl font-semibold text-[#e9c979]">{formatNgn(total)}</p>
                </div>
                <div className="mt-5 space-y-2">
                  {cartLines.map((line) => (
                    <div key={line.sku} className="flex items-center justify-between gap-4 border-b border-white/10 py-3 text-sm">
                      <span className="text-white/75">{line.product.title} × {line.quantity}</span>
                      <span className="text-white/55">{formatNgn(Number(line.product.variant_price) * line.quantity)}</span>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleCheckout} className="mt-6 grid gap-3 sm:grid-cols-2">
                  <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="border-white/10 bg-black/30 text-white" />
                  <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className="border-white/10 bg-black/30 text-white" />
                  <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="border-white/10 bg-black/30 text-white" />
                  {requiresAddress && <Input required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Delivery address" className="border-white/10 bg-black/30 text-white sm:col-span-2" />}
                  {checkoutError && <p className="text-sm text-red-300 sm:col-span-2">{checkoutError}</p>}
                  <Button type="submit" disabled={checkoutBusy} className="rounded-full bg-[#e9c979] text-[#15130e] hover:bg-[#f3d992] sm:col-span-2">
                    {checkoutBusy ? "Preparing secure checkout…" : "Continue to Paystack"} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs leading-5 text-white/40 sm:col-span-2">ResoFit Paystack checkout revalidates every SKU, price and fulfillment rule on the server. Jumia candidates and Elite101 service offers are not included in this cart.</p>
                </form>
              </section>
            )}

            <section className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
              <span>Collection registry version {collection.version} · {collection.canonical_path}</span>
              <Link to="/monetization" className="inline-flex items-center gap-2 text-[#f4d58b]">Explore Elite services <ArrowRight className="h-4 w-4" /></Link>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
