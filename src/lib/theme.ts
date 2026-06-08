// Definicje motywów + radius modes. Wartości aplikowane przez data-attributes
// na <html>, mapowane na zmienne CSS w globals.css.

export type ThemeId =
  | "neutral"
  | "light"
  | "dark"
  | "indigo"
  | "orange"
  | "forest"
  | "rose";

export type RadiusMode = "normal" | "mega";

export const THEMES: { id: ThemeId; label: string; swatch: string; dark?: boolean }[] = [
  { id: "neutral", label: "Neutralny", swatch: "#3f3f46" },
  { id: "light", label: "Jasny", swatch: "#71717a" },
  { id: "dark", label: "Ciemny", swatch: "#18181b", dark: true },
  { id: "indigo", label: "Indygo", swatch: "#6366f1" },
  { id: "orange", label: "Pomarańczowy", swatch: "#ea580c" },
  { id: "forest", label: "Leśny", swatch: "#15803d" },
  { id: "rose", label: "Różany", swatch: "#e11d48" },
];

export const DEFAULT_THEME: ThemeId = "dark";
export const DEFAULT_RADIUS: RadiusMode = "normal";

export const THEME_STORAGE_KEY = "dziennik-theme";
export const RADIUS_STORAGE_KEY = "dziennik-radius";

// Skrypt wstrzykiwany w <head> przed hydracją, żeby uniknąć flash of wrong theme.
export const THEME_INIT_SCRIPT = `
(function(){try{
  var t=localStorage.getItem('${THEME_STORAGE_KEY}')||'${DEFAULT_THEME}';
  var r=localStorage.getItem('${RADIUS_STORAGE_KEY}')||'${DEFAULT_RADIUS}';
  document.documentElement.setAttribute('data-theme',t);
  document.documentElement.setAttribute('data-radius',r);
}catch(e){}})();
`;
