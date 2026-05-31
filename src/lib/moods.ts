export type MoodKey =
  | "spokoj"
  | "energia"
  | "smutek"
  | "zlosc"
  | "refleksja"
  | "zmeczenie"
  | "radosc";

export interface MoodDef {
  key: MoodKey;
  label: string;
  emoji: string;
}

export const MOODS: MoodDef[] = [
  { key: "radosc", label: "Radość", emoji: "😊" },
  { key: "spokoj", label: "Spokój", emoji: "🌿" },
  { key: "energia", label: "Energia", emoji: "⚡" },
  { key: "refleksja", label: "Refleksja", emoji: "💭" },
  { key: "smutek", label: "Smutek", emoji: "🌧️" },
  { key: "zlosc", label: "Złość", emoji: "🔥" },
  { key: "zmeczenie", label: "Zmęczenie", emoji: "😴" },
];

export const MOOD_BY_KEY: Record<string, MoodDef> = Object.fromEntries(
  MOODS.map((m) => [m.key, m])
);

export function parseMoods(value: string | null | undefined): MoodDef[] {
  if (!value) return [];
  return value
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .map((k) => MOOD_BY_KEY[k])
    .filter(Boolean);
}

export function serializeMoods(keys: string[]): string | null {
  const cleaned = keys.filter((k) => MOOD_BY_KEY[k]);
  if (cleaned.length === 0) return null;
  return cleaned.join(",");
}
