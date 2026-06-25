// Sklep (headless WooCommerce). Server Component — produkty pobierane serwerowo
// przez src/lib/woocommerce.ts (klucze REST API server-only, nie trafiają do
// przeglądarki). Patrz pamięć projektu: architektura sklepu.

import { AppShell } from "@/components/AppShell";
import {
  isWooConfigured,
  listProducts,
  type WooProduct,
} from "@/lib/woocommerce";

export const metadata = { title: "Sklep — Dziennik" };

// Świeże dane co 60 s (produkty rzadko się zmieniają).
export const revalidate = 60;

const PLN = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

function formatPrice(p: WooProduct): string | null {
  const n = Number(p.price);
  if (p.price === "" || Number.isNaN(n)) return null;
  if (n === 0) return "Darmowy";
  return PLN.format(n);
}

function ProductCard({ p }: { p: WooProduct }) {
  const img = p.images[0];
  const price = formatPrice(p);
  return (
    <article className="rounded-2xl border border-border overflow-hidden flex flex-col bg-background">
      <div className="aspect-square bg-foreground/5 flex items-center justify-center overflow-hidden">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.src}
            alt={img.alt || p.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-muted text-sm">Brak zdjęcia</span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <h2 className="text-sm font-medium leading-tight">{p.name}</h2>
        <div className="mt-auto flex items-center justify-between pt-2">
          {price ? (
            <span className="text-sm font-semibold">{price}</span>
          ) : (
            <span className="text-xs text-muted">—</span>
          )}
          {p.stock_status === "outofstock" && (
            <span className="text-[11px] text-muted">Niedostępny</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function SklepPage() {
  let products: WooProduct[] = [];
  let error: string | null = null;

  if (!isWooConfigured()) {
    error = "Sklep nie jest skonfigurowany (brak kluczy WooCommerce w env).";
  } else {
    try {
      products = await listProducts({ perPage: 24 });
    } catch (e) {
      error = e instanceof Error ? e.message : "Nie udało się pobrać produktów.";
    }
  }

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sklep</h1>
        <p className="text-sm text-muted mt-1">
          Odblokuj dodatkowe funkcje i asystentów.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-border bg-foreground/5 p-4 text-sm text-muted">
          {error}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">
            Brak produktów. Dodaj je w panelu WooCommerce, a pojawią się tutaj.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
