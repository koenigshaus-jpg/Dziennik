"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_RADIUS,
  DEFAULT_THEME,
  RADIUS_STORAGE_KEY,
  THEME_STORAGE_KEY,
  type RadiusMode,
  type ThemeId,
} from "@/lib/theme";

type ThemeCtx = {
  theme: ThemeId;
  radius: RadiusMode;
  setTheme: (t: ThemeId) => void;
  setRadius: (r: RadiusMode) => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME);
  const [radius, setRadiusState] = useState<RadiusMode>(DEFAULT_RADIUS);

  useEffect(() => {
    const root = document.documentElement;
    const t = (root.getAttribute("data-theme") as ThemeId) || DEFAULT_THEME;
    const r = (root.getAttribute("data-radius") as RadiusMode) || DEFAULT_RADIUS;
    setThemeState(t);
    setRadiusState(r);
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {}
    setThemeState(t);
  }, []);

  const setRadius = useCallback((r: RadiusMode) => {
    document.documentElement.setAttribute("data-radius", r);
    try {
      localStorage.setItem(RADIUS_STORAGE_KEY, r);
    } catch {}
    setRadiusState(r);
  }, []);

  return (
    <Ctx.Provider value={{ theme, radius, setTheme, setRadius }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}
