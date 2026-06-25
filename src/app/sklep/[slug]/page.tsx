// Szczegóły produktu w sklepie — opis + zakup (subskrypcja roczna) + CTA pakietu.
// Server Component; dane z WooCommerce (server-only).

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Check, RefreshCw, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProductIcon } from "@/components/shop/ProductIcon";
import { BuyButton } from "@/components/shop/BuyButton";
import {
  getMeta,
  getProductIcon,
  getProductSku,
  isBundle,
  isFreeProduct,
  isWooConfigured,
  listProducts,
  type WooProduct,
} from "@/lib/woocommerce";
import { priceLabel, stripHtml } from "@/lib/shop";

export const revalidate = 60;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isWooConfigured()) notFound();

  const products = await listProducts({ perPage: 50 });
  // Dopasowanie po slugu WC, po persona_key (link z listy person) lub "all" (pakiet).
  const p = products.find(
    (x) =>
      x.slug === slug ||
      getMeta(x, "persona_key") === slug ||
      (slug === "all" && isBundle(x)),
  );
  if (!p) notFound();

  const bundle = products.find(isBundle);
  const free = isFreeProduct(p);
  const bundleProduct = isBundle(p);
  const sku = getProductSku(p);
  const img = p.images[0];
  const desc = stripHtml(p.description) || stripHtml(p.short_description);
  // Konsultanci wchodzący w skład pakietu (produkty z persona_key).
  const includedConsultants = products.filter((x) => getMeta(x, "persona_key"));

  return (
    <AppShell>
      <header className="mb-5">
        <Link
          href="/sklep"
          aria-label="Wróć do sklepu"
          className="-ml-2 inline-flex items-center gap-1 h-10 pl-1 pr-3 rounded-full text-sm text-muted hover:bg-foreground/5 hover:text-foreground"
        >
          <ChevronLeft className="h-5 w-5" />
          Sklep
        </Link>
      </header>

      <div className="rounded-2xl border border-border overflow-hidden bg-background">
        <div className="relative aspect-[16/9] flex items-center justify-center overflow-hidden bg-foreground/[0.03]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.src} alt={img.alt || p.name} className="h-full w-full object-cover" />
          ) : (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,#7dd3fc,#c4b5fd,#f9a8d4,#fcd34d,#7dd3fc)] opacity-30 blur-3xl"
              />
              <ProductIcon
                name={bundleProduct ? "Sparkles" : getProductIcon(p)}
                className="relative h-14 w-14 text-foreground/80"
              />
            </>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {p.name}
          </h1>
          <p className="mt-1 text-sm font-medium text-muted">{priceLabel(p.price)}</p>

          {desc && <p className="mt-4 text-sm leading-relaxed text-foreground/90">{desc}</p>}

          {/* Pakiet: co zawiera */}
          {bundleProduct && includedConsultants.length > 0 && (
            <div className="mt-5">
              <p className="text-xs uppercase tracking-wider text-muted font-medium mb-2">
                Co zawiera ({includedConsultants.length})
              </p>
              <ul className="flex flex-col gap-1.5">
                {includedConsultants.map((c) => (
                  <li key={c.id} className="flex items-center gap-2.5 text-sm">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06]">
                      <ProductIcon
                        name={getProductIcon(c)}
                        className="h-3.5 w-3.5 text-foreground/70"
                      />
                    </span>
                    <span className="flex-1 min-w-0 truncate">{c.name}</span>
                    {isFreeProduct(c) && (
                      <span className="text-[11px] text-muted">w cenie</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Akcja zakupu */}
          <div className="mt-6">
            {free ? (
              <span className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-border text-sm text-muted">
                <Check className="h-4 w-4" />
                Dostępny za darmo
              </span>
            ) : sku ? (
              <>
                <BuyButton sku={sku} className="w-full sm:w-auto">
                  Kup — subskrypcja roczna
                </BuyButton>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Odnawia się co 12 miesięcy. Możesz anulować w każdej chwili.
                </p>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* CTA pakietu — gdy oglądamy pojedynczego konsultanta */}
      {!bundleProduct && bundle && (
        <section className="mt-4 rounded-2xl border border-foreground/15 bg-foreground/[0.03] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/8">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-base font-bold tracking-tight">
                Chcesz wszystkich?
              </h2>
              <p className="text-sm text-muted mt-0.5">
                Pakiet odblokowuje każdego konsultanta — obecnego i przyszłego —
                taniej niż osobno ({priceLabel(bundle.price)}).
              </p>
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <BuyButton sku="all" variant="outline">
                  Kup pakiet
                </BuyButton>
                <Link
                  href={`/sklep/${bundle.slug}`}
                  className="text-sm text-muted hover:text-foreground"
                >
                  Szczegóły pakietu
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}
