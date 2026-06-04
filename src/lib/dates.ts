const PL_MONTHS = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
];

const PL_WEEKDAYS = [
  "niedziela",
  "poniedziałek",
  "wtorek",
  "środa",
  "czwartek",
  "piątek",
  "sobota",
];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

export function formatLongPL(d: Date): string {
  return `${d.getDate()} ${PL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatWithWeekdayPL(d: Date): string {
  return `${PL_WEEKDAYS[d.getDay()]}, ${formatLongPL(d)}`;
}

export function formatTimePL(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTimeLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatShortPL(d: Date): string {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "Czwartek 4.06.2026" — pełna nazwa dnia + skrócona data (dzień bez 0). */
export function formatWeekdayDotPL(d: Date): string {
  return `${PL_WEEKDAYS[d.getDay()]} ${d.getDate()}.${pad(
    d.getMonth() + 1
  )}.${d.getFullYear()}`;
}

const PL_WEEKDAYS_SHORT = ["niedz", "pon", "wt", "śr", "czw", "pt", "sob"];

const PL_MONTHS_NOM = [
  "styczeń",
  "luty",
  "marzec",
  "kwiecień",
  "maj",
  "czerwiec",
  "lipiec",
  "sierpień",
  "wrzesień",
  "październik",
  "listopad",
  "grudzień",
];

export function formatDayShortPL(d: Date): string {
  return PL_WEEKDAYS_SHORT[d.getDay()];
}

export function formatMonthYearPL(d: Date): string {
  return `${PL_MONTHS_NOM[d.getMonth()]} ${d.getFullYear()}`;
}

export function toIsoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseIsoLocalDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  const d = new Date(y, mo, da, 0, 0, 0, 0);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== da) return null;
  return d;
}

export function startOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

export function endOfDayLocal(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Dla wpisu tworzonego na konkretny dzień: jeśli to dziś — bieżąca godzina,
 *  inaczej — godzina 12:00 wybranego dnia. */
export function createdAtForDay(iso: string): Date {
  const day = parseIsoLocalDate(iso);
  if (!day) return new Date();
  if (isSameLocalDay(day, new Date())) return new Date();
  day.setHours(12, 0, 0, 0);
  return day;
}
