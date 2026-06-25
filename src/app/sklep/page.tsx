// Sklep (headless WooCommerce). Server Component — produkty serwerowo przez
// src/lib/woocommerce.ts. Karty linkują do /sklep/[slug] (szczegóły + zakup).

import Link from "next/link";
import { ChevronLeft, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductIcon } from "@/components/shop/ProductIcon";
import { BuyButton } from "@/components/shop/BuyButton";
import {
  getProductIcon,
  isBundle,
  isWooConfigured,
  listProducts,
  type WooProduct,
} from "@/lib/woocommerce";
import { priceLabel, stripHtml } from "@/lib/shop";

export const metadata = { title: "Sklep — Dziennik" };
export const revalidate = 60;

function ProductCard({ p }: { p: WooProduct }) {
  const img = p.images[0];
  return (
    <Link
      href={`/sklep/${p.slug}`}
      className="group rounded-2xl border border-border overflow-hidden flex flex-col bg-background hover:border-foreground/30 transition-colors"
    >
      <div className="relative aspect-[4/3] flex items-center justify-center overflow-hidden bg-foreground/[0.03]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img.src} alt={img.alt || p.name} className="h-full w-full object-cover" />
        ) : (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,#7dd3fc,#c4b5fd,#f9a8d4,#fcd34d,#7dd3fc)] opacity-25 blur-2xl group-hover:opacity-40 transition-opacity"
            />
            <ProductIcon
              name={getProductIcon(p)}
              className="relative h-8 w-8 text-foreground/70"
            />
          </>
        )}
      </div>
      <div className="p-3.5 flex flex-col gap-1 flex-1">
        <h2 className="text-sm font-medium leading-tight">{p.name}</h2>
        <span className="mt-auto pt-2 text-sm text-muted">{priceLabel(p.price)}</span>
      </div>
    </Link>
  );
}

export default async function SklepPage() {
  let products: WooProduct[] = [];
  let error: string | null = null;

  if (!isWooConfigured()) {
    error = "Sklep nie jest skonfigurowany.";
  } else {
    try {
      products = await listProducts({ perPage: 24 });
    } catch (e) {
      error = e instanceof Error ? e.message : "Nie udało się pobrać produktów.";
    }
  }

  const bundle = products.find(isBundle);
  const items = products.filter((p) => !isBundle(p));

  return (
    <AppShell>
      <header className="mb-6">
        <div className="flex items-center gap-1 mb-1">
          <Link
            href="/"
            aria-label="Wróć"
            className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground/5"
          >
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight">Sklep</h1>
        </div>
        <p className="text-sm text-muted pl-1">
          Odblokuj konsultantów AI. Subskrypcja roczna.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-border bg-foreground/5 p-4 text-sm text-muted">
          {error}
        </div>
      ) : (
        <>
          {bundle && (
            <section className="mb-6 rounded-2xl border border-foreground/15 bg-foreground/[0.03] p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/8">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-lg font-bold tracking-tight">
                    {bundle.name}
                  </h2>
                  <p className="text-sm text-muted mt-0.5">
                    {stripHtml(bundle.short_description) ||
                      "Wszyscy konsultanci — obecni i przyszli — w jednej cenie."}
                  </p>
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <BuyButton sku="all">
                      Kup pakiet — {priceLabel(bundle.price)}
                    </BuyButton>
                    <Link
                      href={`/sklep/${bundle.slug}`}
                      className="text-sm text-muted hover:text-foreground"
                    >
                      Szczegóły
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted">
                Brak produktów. Dodaj je w panelu WooCommerce.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
