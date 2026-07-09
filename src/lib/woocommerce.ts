// Klient WooCommerce REST API (headless). Backend to osobny WordPress+WooCommerce
// (np. https://sklep.koenigshaus.pl) — patrz CLAUDE.md / pamięć projektu.
//
// SERVER-ONLY: używa Consumer Key/Secret z env (NIE NEXT_PUBLIC). Klucze nigdy
// nie trafiają do przeglądarki — produkty i zamówienia idą przez Route Handlery /
// Server Components, nie z klienta. Auth: HTTP Basic (ck:cs) po HTTPS.

const BASE = process.env.WOOCOMMERCE_URL;
const CK = process.env.WOOCOMMERCE_CONSUMER_KEY;
const CS = process.env.WOOCOMMERCE_CONSUMER_SECRET;

export function isWooConfigured(): boolean {
  return Boolean(BASE && CK && CS);
}

function authHeader(): string {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

/** Surowe wywołanie WC REST API v3. `path` bez wiodącego slasha, np. "products". */
async function wc<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | number | undefined> },
): Promise<T> {
  if (!isWooConfigured()) {
    throw new Error(
      "WooCommerce nieskonfigurowane — ustaw WOOCOMMERCE_URL/_CONSUMER_KEY/_CONSUMER_SECRET w env.",
    );
  }
  const url = new URL(`${BASE}/wp-json/wc/v3/${path}`);
  for (const [k, v] of Object.entries(init?.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    // Produkty mogą się cache'ować krótko; zamówienia (POST) i tak omijają cache.
    next: init?.method && init.method !== "GET" ? undefined : { revalidate: 60 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`WooCommerce ${path} → ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

// --- Typy (podzbiór pól WC, których realnie używamy) ---

export interface WooImage {
  id: number;
  src: string;
  alt: string;
}

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  type: string;
  status: string;
  description: string;
  short_description: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  stock_status: "instock" | "outofstock" | "onbackorder";
  images: WooImage[];
  categories: { id: number; name: string; slug: string }[];
  meta_data?: { key: string; value: string }[];
}

export function getMeta(p: WooProduct, key: string): string | undefined {
  return p.meta_data?.find((m) => m.key === key)?.value || undefined;
}

/** Czy produkt to pakiet „wszystko" (meta bundle_sku=all). */
export function isBundle(p: WooProduct): boolean {
  return getMeta(p, "bundle_sku") === "all";
}

/** Czy produkt jest darmowy (cena 0). */
export function isFreeProduct(p: WooProduct): boolean {
  return p.price === "0" || Number(p.price) === 0;
}

/** Ikona persony (lucide) z meta, jeśli to produkt-konsultant. */
export function getProductIcon(p: WooProduct): string | undefined {
  return getMeta(p, "persona_icon");
}

/** SKU produktu do checkoutu: persona_key | "all" (pakiet) | null. */
export function getProductSku(p: WooProduct): string | null {
  return getMeta(p, "persona_key") ?? (isBundle(p) ? "all" : null);
}

/**
 * Mapa SKU → Stripe price ID (meta `stripe_price_id` na produkcie WC, zapisywana
 * przez scripts/seed-stripe.ts). Server-only. Pusta, gdy sklep niedostępny.
 *
 * Override: jeśli ustawiona jest zmienna `STRIPE_PRICE_MAP` (JSON `{sku: priceId}`),
 * używamy jej ZAMIAST WooCommerce. Wykorzystywane na eksperymencie (Preview) do
 * podania testowych ID cen Stripe bez ruszania współdzielonego meta `stripe_price_id`
 * w WooCommerce (które trzyma ceny LIVE produkcji). W produkcji ta zmienna nie
 * istnieje → zachowanie bez zmian.
 */
export async function getStripePriceMap(): Promise<Map<string, string>> {
  const override = process.env.STRIPE_PRICE_MAP;
  if (override) {
    try {
      const obj = JSON.parse(override) as Record<string, string>;
      return new Map(Object.entries(obj).filter(([, v]) => typeof v === "string" && v));
    } catch {
      // Zły JSON → nie wysadzaj checkoutu, spadnij do WooCommerce.
    }
  }

  const map = new Map<string, string>();
  if (!isWooConfigured()) return map;
  let products: WooProduct[];
  try {
    products = await listProducts({ perPage: 100 });
  } catch {
    return map;
  }
  for (const p of products) {
    const sku = getProductSku(p);
    const priceId = getMeta(p, "stripe_price_id");
    if (sku && priceId) map.set(sku, priceId);
  }
  return map;
}

// --- Operacje ---

/** Lista opublikowanych produktów. */
export function listProducts(opts?: {
  perPage?: number;
  page?: number;
  search?: string;
}): Promise<WooProduct[]> {
  return wc<WooProduct[]>("products", {
    query: {
      status: "publish",
      per_page: opts?.perPage ?? 20,
      page: opts?.page ?? 1,
      search: opts?.search,
      orderby: "date",
      order: "desc",
    },
  });
}

/** Pojedynczy produkt po slugu (zwraca null, gdy brak). */
export async function getProductBySlug(slug: string): Promise<WooProduct | null> {
  const rows = await wc<WooProduct[]>("products", { query: { slug } });
  return rows[0] ?? null;
}

/** Produkt po ID. */
export function getProductById(id: number): Promise<WooProduct> {
  return wc<WooProduct>(`products/${id}`);
}

/** Aktualizuje pola własne (meta_data) produktu. */
export async function updateProductMeta(
  id: number,
  meta: { key: string; value: string }[],
): Promise<void> {
  await wc(`products/${id}`, {
    method: "PUT",
    body: JSON.stringify({ meta_data: meta }),
  });
}

// --- Persony jako produkty (konsultanci) ---
// Każdy konsultant ma produkt z polami własnymi persona_* (patrz scripts/seed-shop.ts).
// To pozwala edytować prompt w panelu WooCommerce, a aplikacja czyta go stąd.

interface WooMeta {
  key: string;
  value: string;
}
interface WooProductWithMeta extends WooProduct {
  meta_data?: WooMeta[];
}

/** Nadpisania persony pobrane z WooCommerce (pola obecne tylko, gdy ustawione). */
export interface WooPersonaOverride {
  key: string;
  productId: number;
  price: string;
  name?: string;
  description?: string;
  systemPrompt?: string;
  defaultModel?: string;
  deepModel?: string;
  temperature?: number;
  icon?: string;
}

/**
 * Mapa persona_key → nadpisania z WooCommerce. Server-only.
 * Zwraca pustą mapę, gdy sklep nieskonfigurowany lub niedostępny (graceful —
 * wywołujący użyje wtedy wartości z kodu jako fallback).
 */
export async function getPersonaOverrides(): Promise<Map<string, WooPersonaOverride>> {
  const map = new Map<string, WooPersonaOverride>();
  if (!isWooConfigured()) return map;
  let products: WooProductWithMeta[];
  try {
    products = await wc<WooProductWithMeta[]>("products", {
      query: { per_page: 100, status: "publish" },
    });
  } catch {
    return map; // sklep niedostępny → fallback do kodu
  }
  for (const p of products) {
    const meta = new Map((p.meta_data ?? []).map((m) => [m.key, m.value]));
    const key = meta.get("persona_key");
    if (!key) continue;
    const temp = meta.get("persona_temperature");
    map.set(key, {
      key,
      productId: p.id,
      price: p.price,
      name: p.name || undefined,
      description: p.short_description || undefined,
      systemPrompt: meta.get("persona_prompt") || undefined,
      defaultModel: meta.get("persona_model") || undefined,
      deepModel: meta.get("persona_deep_model") || undefined,
      temperature: temp !== undefined && temp !== "" ? Number(temp) : undefined,
      icon: meta.get("persona_icon") || undefined,
    });
  }
  return map;
}
