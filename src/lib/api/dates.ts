// Pomocnik: data "dzisiaj" w strefie Europe/Warsaw (do filtrów typu `day=...`).
// Skill `dziennik` używał tej samej strefy — trzymamy spójność.

export function todayInWarsaw(): string {
  // pl-PL z 'sv-SE' lub poprostu po komponentach
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date()); // "YYYY-MM-DD"
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: string): boolean {
  return ISO_DATE.test(s);
}
