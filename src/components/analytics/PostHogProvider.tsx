"use client";

// Integracja PostHog (analityka użytkowania) — TYLKO gałąź `eksperyment`.
// Włączone: autocapture + pageviews (ręcznie, bo App Router), nagrania sesji,
// heatmapy, Web Analytics, Web Vitals, error tracking.
//
// PRYWATNOŚĆ (świadomy wybór): nagrania maskują pola formularzy
// (`maskAllInputs`), ale NIE maskują wyświetlanej treści wpisów. To dziennik —
// jeśli chcesz ukryć też treść wpisów w nagraniach, ustaw `maskAllText: true`
// w `session_recording` niżej (heatmapy i analiza UX dalej działają).
//
// Inicjalizacja jest no-op, gdy brak `NEXT_PUBLIC_POSTHOG_KEY` — czyli lokalnie
// bez configu i na produkcji (`main`) PostHog po prostu się nie ładuje.

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { getSupabaseClient } from "@/lib/supabase/client";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (!POSTHOG_KEY || posthog.__loaded) return;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      // Profile osób tylko dla zalogowanych → anonimowy ruch nie tworzy
      // person profiles (taniej, czyściej). Identyfikacja niżej w Identify.
      person_profiles: "identified_only",

      // Pageviews łapiemy ręcznie (App Router nie emituje pełnych nawigacji).
      capture_pageview: false,
      capture_pageleave: true,

      // Autocapture: automatyczne klik/submit/change → podstawa heatmap i analiz.
      autocapture: true,
      enable_heatmaps: true,

      // Web Vitals (LCP/CLS/INP…) — zasila Web Analytics.
      capture_performance: { web_vitals: true },

      // Error tracking — automatyczne raportowanie nieobsłużonych wyjątków JS.
      capture_exceptions: true,

      // Nagrania sesji. maskAllInputs → maskuje wszystkie pola input/textarea.
      // (Treść wyświetlanych wpisów NIE jest maskowana — patrz nagłówek pliku.)
      session_recording: {
        maskAllInputs: true,
      },
    });
  }, []);

  if (!POSTHOG_KEY) return <>{children}</>;

  return (
    <PHProvider client={posthog}>
      <React.Suspense fallback={null}>
        <PageviewTracker />
      </React.Suspense>
      <Identify />
      {children}
    </PHProvider>
  );
}

// Ręczne $pageview przy każdej nawigacji App Routera. useSearchParams wymaga
// granicy <Suspense> (jest wyżej).
function PageviewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  React.useEffect(() => {
    if (!pathname || !ph) return;
    let url = window.location.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    ph.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

// Wiąże zdarzenia/nagrania z użytkownikiem Supabase (po id, nie e-mailu).
// Odróżnia testerów anonimowych (`signInAnonymously`) od zalogowanych.
function Identify() {
  const ph = usePostHog();

  React.useEffect(() => {
    if (!ph) return;
    const supabase = getSupabaseClient();

    const apply = (user: { id: string; is_anonymous?: boolean } | null) => {
      if (user) {
        ph.identify(user.id, { is_anonymous: user.is_anonymous ?? false });
      } else {
        ph.reset();
      }
    };

    supabase.auth
      .getUser()
      .then((res: { data: { user: { id: string; is_anonymous?: boolean } | null } }) =>
        apply(res.data.user),
      )
      .catch(() => {
        /* brak sesji → zostajemy anonimowi */
      });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: string, session: { user?: { id: string; is_anonymous?: boolean } } | null) => {
        if (event === "SIGNED_OUT") ph.reset();
        else if (session?.user) apply(session.user);
      },
    );

    return () => sub.subscription.unsubscribe();
  }, [ph]);

  return null;
}
