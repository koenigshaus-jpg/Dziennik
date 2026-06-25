// Pomocnicze formatery sklepu (czyste funkcje, bezpieczne klient/serwer).

const PLN = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

export function formatPLN(price: string): string | null {
  const n = Number(price);
  if (price === "" || Number.isNaN(n)) return null;
  return PLN.format(n);
}

/** Etykieta ceny. Darmowy → "Darmowy"; płatny → "X zł / rok" (subskrypcja). */
export function priceLabel(price: string): string {
  const n = Number(price);
  if (price === "" || Number.isNaN(n)) return "";
  if (n === 0) return "Darmowy";
  const f = PLN.format(n);
  return `${f} / rok`;
}

/** Usuwa tagi HTML (opis z WooCommerce bywa owinięty w <p>). */
export function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
