"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  listEntries,
  listAllTagsWithCount,
  type ClientEntry,
} from "@/lib/db-supabase";
import {
  addDays,
  endOfDayLocal,
  formatLongPL,
  formatShortPL,
  formatTimePL,
  parseIsoLocalDate,
  startOfDayLocal,
  toIsoLocalDate,
} from "@/lib/dates";
import { snippet } from "@/lib/text";
import { parseMoods, MOODS } from "@/lib/moods";
import { Image as ImageIcon, Mic, Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { HistorySplit } from "@/components/history/HistorySplit";
import { HistoryPreviewPane } from "@/components/history/HistoryPreviewPane";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { DateStrip } from "@/components/mobile/DateStrip";
import { MobileEntryList } from "@/components/mobile/MobileEntryList";
import { ComposerBar } from "@/components/mobile/ComposerBar";
import { MicFab } from "@/components/mobile/MicFab";
import { APP_VERSION } from "@/lib/version";

const BASE_BACK_DAYS = 5;
const BASE_AHEAD_DAYS = 5;
const LOW_ENTRY_THRESHOLD = 10;
const EXTEND_STEP_DAYS = 5;
const MAX_EXTRA_DAYS = 55;

function parseLocalDateStart(iso: string): number | undefined {
  const d = parseIsoLocalDate(iso);
  return d ? startOfDayLocal(d).getTime() : undefined;
}

function parseLocalDateEnd(iso: string): number | undefined {
  const d = parseIsoLocalDate(iso);
  return d ? endOfDayLocal(d).getTime() : undefined;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <AppShell wide>
          <p className="text-muted">Wczytuję…</p>
        </AppShell>
      }
    >
      <HomePageInner />
    </Suspense>
  );
}

function HomePageInner() {
  const router = useRouter();
  const params = useSearchParams();

  // Filtry (URL) — używane głównie na desktop
  const q = params.get("q")?.trim() || "";
  const tag = params.get("tag") || "";
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const moodParam = params.get("mood") || "";
  const selectedId = params.get("id") || "";
  const selectedMoods = useMemo(
    () => moodParam.split(",").map((m) => m.trim()).filter(Boolean),
    [moodParam]
  );

  // Wybrany dzień (mobile)
  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toIsoLocalDate(today), [today]);
  const dayParam = params.get("d") || "";
  const selectedDay = dayParam || todayIso;
  const selectedDayDate = useMemo(
    () => parseIsoLocalDate(selectedDay) ?? today,
    [selectedDay, today]
  );

  // Rozszerzalne okno wokół wybranego dnia
  const [extraBack, setExtraBack] = useState(0);
  const [extraAhead, setExtraAhead] = useState(0);

  // Reset rozszerzeń przy zmianie wybranego dnia
  useEffect(() => {
    setExtraBack(0);
    setExtraAhead(0);
  }, [selectedDay]);

  const totalBack = BASE_BACK_DAYS + extraBack;
  const totalAhead = BASE_AHEAD_DAYS + extraAhead;

  const windowStart = useMemo(
    () => startOfDayLocal(addDays(selectedDayDate, -totalBack)),
    [selectedDayDate, totalBack]
  );
  const windowEnd = useMemo(
    () => endOfDayLocal(addDays(selectedDayDate, totalAhead)),
    [selectedDayDate, totalAhead]
  );
  const rangeStartIso = useMemo(() => toIsoLocalDate(windowStart), [windowStart]);
  const rangeEndIso = useMemo(() => toIsoLocalDate(windowEnd), [windowEnd]);

  // Swipe gesture state — touch + pointer
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  // Stan
  const [entries, setEntries] = useState<ClientEntry[] | null>(null);
  const [windowEntries, setWindowEntries] = useState<ClientEntry[] | null>(null);
  const [allTags, setAllTags] = useState<{ name: string; count: number }[]>([]);
  const [searchDraft, setSearchDraft] = useState(q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const fromMs = from ? parseLocalDateStart(from) : undefined;
  const toMs = to ? parseLocalDateEnd(to) : undefined;

  // Desktop: pełna lista z filtrami
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [es, ts] = await Promise.all([
          listEntries({
            q: q || undefined,
            tag: tag || undefined,
            from: fromMs,
            to: toMs,
            moods: selectedMoods.length > 0 ? selectedMoods : undefined,
          }),
          listAllTagsWithCount(),
        ]);
        if (!cancelled) {
          setEntries(es);
          setAllTags(ts);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setEntries([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q, tag, from, to, fromMs, toMs, selectedMoods, reloadKey]);

  // Mobile: wpisy w oknie dnia
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const es = await listEntries({
          from: windowStart.getTime(),
          to: windowEnd.getTime(),
        });
        if (!cancelled) setWindowEntries(es);
      } catch (e) {
        console.error(e);
        if (!cancelled) setWindowEntries([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [windowStart, windowEnd, reloadKey]);

  useEffect(() => {
    const refetch = () => setReloadKey((k) => k + 1);
    window.addEventListener("entries-changed", refetch);
    window.addEventListener("focus", refetch);
    return () => {
      window.removeEventListener("entries-changed", refetch);
      window.removeEventListener("focus", refetch);
    };
  }, []);

  // Auto-expand: gdy w bazowym oknie ±5 wpisów <10, rozszerz raz do ±10
  useEffect(() => {
    if (windowEntries === null) return;
    if (
      windowEntries.length < LOW_ENTRY_THRESHOLD &&
      extraBack === 0 &&
      extraAhead === 0
    ) {
      setExtraBack(EXTEND_STEP_DAYS);
      setExtraAhead(EXTEND_STEP_DAYS);
    }
  }, [windowEntries, extraBack, extraAhead]);

  const extendOlder = useCallback(() => {
    setExtraBack((b) => Math.min(b + EXTEND_STEP_DAYS, MAX_EXTRA_DAYS));
  }, []);
  const extendNewer = useCallback(() => {
    setExtraAhead((a) => Math.min(a + EXTEND_STEP_DAYS, MAX_EXTRA_DAYS));
  }, []);

  // Liczniki wpisów per dzień (do strip + kalendarza)
  const entryCountsByDay = useMemo(() => {
    const map = new Map<string, number>();
    if (!windowEntries) return map;
    for (const e of windowEntries) {
      const iso = toIsoLocalDate(new Date(e.createdAt));
      map.set(iso, (map.get(iso) ?? 0) + 1);
    }
    return map;
  }, [windowEntries]);

  const buildHref = useCallback(
    (next: {
      q?: string;
      tag?: string;
      from?: string;
      to?: string;
      moods?: string[];
      id?: string;
      d?: string;
    }) => {
      const sp = new URLSearchParams();
      if (next.q) sp.set("q", next.q);
      if (next.tag) sp.set("tag", next.tag);
      if (next.from) sp.set("from", next.from);
      if (next.to) sp.set("to", next.to);
      if (next.moods && next.moods.length > 0) sp.set("mood", next.moods.join(","));
      if (next.id) sp.set("id", next.id);
      if (next.d) sp.set("d", next.d);
      return `/${sp.toString() ? `?${sp}` : ""}`;
    },
    []
  );

  function pushFilters(next: {
    q?: string;
    tag?: string;
    from?: string;
    to?: string;
    moods?: string[];
    id?: string;
    d?: string;
  }) {
    router.replace(
      buildHref({
        id: selectedId || undefined,
        d: dayParam || undefined,
        ...next,
      })
    );
  }

  useEffect(() => {
    const trimmed = searchDraft.trim();
    const next = trimmed.length >= 3 ? trimmed : "";
    if (next === q) return;
    const t = setTimeout(() => {
      pushFilters({ q: next, tag, from, to, moods: selectedMoods });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  function clearSearch() {
    setSearchDraft("");
    pushFilters({ tag, from, to, moods: selectedMoods });
  }

  function setRange(nextFrom: string, nextTo: string) {
    pushFilters({ q, tag, from: nextFrom, to: nextTo, moods: selectedMoods });
  }

  function setTag(nextTag: string) {
    pushFilters({ q, tag: nextTag, from, to, moods: selectedMoods });
  }

  function toggleMood(key: string) {
    const next = selectedMoods.includes(key)
      ? selectedMoods.filter((m) => m !== key)
      : [...selectedMoods, key];
    pushFilters({ q, tag, from, to, moods: next });
  }

  function clearAllFilters() {
    setSearchDraft("");
    pushFilters({});
  }

  function selectEntry(id: string) {
    router.replace(
      buildHref({
        q,
        tag,
        from,
        to,
        moods: selectedMoods,
        id,
        d: dayParam || undefined,
      })
    );
  }

  function setSelectedDay(iso: string) {
    router.replace(
      buildHref({
        q,
        tag,
        from,
        to,
        moods: selectedMoods,
        id: selectedId || undefined,
        d: iso === todayIso ? undefined : iso,
      }),
      { scroll: false }
    );
  }

  function applyPreset(preset: "today" | "week" | "month" | "30d") {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = end;
    if (preset === "today") {
      start = end;
    } else if (preset === "week") {
      const dow = (now.getDay() + 6) % 7;
      start = new Date(end);
      start.setDate(end.getDate() - dow);
    } else if (preset === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset === "30d") {
      start = new Date(end);
      start.setDate(end.getDate() - 29);
    }
    setRange(toIsoLocalDate(start), toIsoLocalDate(end));
  }

  const topTags = useMemo(
    () => allTags.filter((t) => t.count > 0).slice(0, 12),
    [allTags]
  );
  const hasFilters = !!(q || tag || from || to || selectedMoods.length > 0);
  const activeFilterCount =
    (tag ? 1 : 0) + (from || to ? 1 : 0) + selectedMoods.length;
  const count = entries?.length ?? 0;
  const loading = entries === null;

  const countText = loading
    ? "Wczytuję…"
    : count === 0 && !hasFilters
    ? "Jeszcze nic tu nie ma."
    : `${count} ${
        count === 1
          ? "wpis"
          : count >= 2 && count <= 4
          ? "wpisy"
          : "wpisów"
      }`;

  const filtersPanel = (
    <div className="mb-3 border border-border rounded-xl overflow-hidden">
      <div className="bg-foreground/[0.02]">
        {activeFilterCount > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border">
            <span className="text-xs uppercase tracking-wider text-muted">
              {activeFilterCount === 1
                ? "1 aktywny filtr"
                : `${activeFilterCount} aktywne filtry`}
            </span>
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-full text-sm text-muted hover:bg-foreground/5 hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Wyczyść
            </button>
          </div>
        )}
        <section className="p-4 flex flex-col gap-3">
          <h3 className="text-xs uppercase tracking-wider text-muted">Zakres dat</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => applyPreset("today")} className="h-8 px-3 rounded-full border border-border text-sm hover:bg-foreground/5">Dziś</button>
            <button type="button" onClick={() => applyPreset("week")} className="h-8 px-3 rounded-full border border-border text-sm hover:bg-foreground/5">Ten tydzień</button>
            <button type="button" onClick={() => applyPreset("month")} className="h-8 px-3 rounded-full border border-border text-sm hover:bg-foreground/5">Ten miesiąc</button>
            <button type="button" onClick={() => applyPreset("30d")} className="h-8 px-3 rounded-full border border-border text-sm hover:bg-foreground/5">Ostatnie 30 dni</button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="text-muted w-8">Od</span>
              <input type="date" value={from} max={to || undefined} onChange={(e) => setRange(e.target.value, to)} className="h-9 rounded-md border border-border bg-background px-2 text-sm" />
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <span className="text-muted w-8">Do</span>
              <input type="date" value={to} min={from || undefined} onChange={(e) => setRange(from, e.target.value)} className="h-9 rounded-md border border-border bg-background px-2 text-sm" />
            </label>
          </div>
          {(from || to) && (
            <p className="text-xs text-muted">
              {from ? formatShortPL(new Date(parseLocalDateStart(from)!)) : "…"}
              {" – "}
              {to ? formatShortPL(new Date(parseLocalDateEnd(to)!)) : "…"}
            </p>
          )}
        </section>

        <section className="p-4 border-t border-border flex flex-col gap-3">
          <h3 className="text-xs uppercase tracking-wider text-muted">Nastrój</h3>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => {
              const active = selectedMoods.includes(m.key);
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggleMood(m.key)}
                  aria-pressed={active}
                  className={
                    "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm transition-colors " +
                    (active ? "bg-foreground text-background border-foreground" : "border-border hover:bg-foreground/5")
                  }
                >
                  <span className="text-base leading-none">{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {topTags.length > 0 && (
          <section className="p-4 border-t border-border flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wider text-muted">Tagi</h3>
            <div className="flex flex-wrap gap-2">
              {topTags.map((t) => {
                const active = tag === t.name;
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setTag(active ? "" : t.name)}
                    aria-pressed={active}
                    className={
                      "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm border transition-colors " +
                      (active ? "bg-foreground text-background border-foreground" : "border-border hover:bg-foreground/5")
                    }
                  >
                    #{t.name}
                    <span className={"text-xs " + (active ? "opacity-80" : "text-muted")}>{t.count}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );

  const searchBar = (
    <form onSubmit={(e) => e.preventDefault()} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
      <Input
        value={searchDraft}
        onChange={(e) => setSearchDraft(e.target.value)}
        placeholder="Szukaj w treści…"
        className="pl-10 pr-10"
      />
      {q && (
        <button
          type="button"
          onClick={clearSearch}
          aria-label="Wyczyść wyszukiwanie"
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-foreground/5 hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );

  const filterToggleBtn = (
    <button
      type="button"
      onClick={() => setFiltersOpen((v) => !v)}
      aria-expanded={filtersOpen}
      aria-label="Filtry"
      className={
        "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors " +
        (filtersOpen
          ? "bg-foreground text-background"
          : "text-muted hover:bg-foreground/5 hover:text-foreground")
      }
    >
      <Filter className="h-5 w-5" />
      {activeFilterCount > 0 && !filtersOpen && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-foreground text-background text-[10px] leading-none">
          {activeFilterCount}
        </span>
      )}
    </button>
  );

  // Desktop list pane (≥ lg)
  const desktopList = (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h1 className="font-display text-2xl font-bold tracking-tight leading-none">
            Dziennik
          </h1>
          {filterToggleBtn}
        </div>
        <p className="text-xs text-muted mb-3">{countText}</p>
        {filtersOpen && filtersPanel}
        {searchBar}
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="py-16 text-center text-muted">Wczytuję wpisy…</div>
        ) : count === 0 ? (
          <div className="py-16 text-center text-muted px-4">
            {hasFilters ? "Brak wpisów pasujących do filtra." : "Jeszcze nic tu nie ma."}
          </div>
        ) : (
          <div className="flex flex-col">
            {entries!.map((e, idx) => {
              const date = new Date(e.createdAt);
              const dayKey = toIsoLocalDate(date);
              const prev = idx > 0 ? entries![idx - 1] : null;
              const showDate =
                !prev || toIsoLocalDate(new Date(prev.createdAt)) !== dayKey;
              const moods = parseMoods(e.mood);
              const hasImages = e.media.some((m) => m.kind === "image");
              const hasAudio = e.media.some((m) => m.kind === "audio");
              const active = e.id === selectedId;
              return (
                <div key={e.id}>
                  {showDate && (
                    <h2 className="font-display text-sm font-semibold tracking-tight px-4 pt-4 pb-1 text-muted uppercase">
                      {formatLongPL(date)}
                    </h2>
                  )}
                  <button
                    type="button"
                    onClick={() => selectEntry(e.id)}
                    className={
                      "w-full text-left block px-4 py-3 border-l-2 transition-colors " +
                      (active
                        ? "bg-foreground/5 border-foreground"
                        : "border-transparent hover:bg-foreground/[0.03]")
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {e.contentText && (
                          <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
                            {snippet(e.contentText, 140)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted shrink-0 pt-0.5">
                        {formatTimePL(date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-muted text-xs flex-wrap">
                      {moods.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-base leading-none">
                          {moods.map((m) => (
                            <span key={m.key} title={m.label}>{m.emoji}</span>
                          ))}
                        </span>
                      )}
                      {hasImages && (
                        <span className="inline-flex items-center gap-1">
                          <ImageIcon className="h-3.5 w-3.5" />
                          {e.media.filter((m) => m.kind === "image").length}
                        </span>
                      )}
                      {hasAudio && (
                        <span className="inline-flex items-center gap-1">
                          <Mic className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {e.tags.map((t) => (
                        <span key={t} className="text-muted">#{t}</span>
                      ))}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // Mobile (< lg) — nowy widok dnia
  const mobileView = (
    <div className="lg:hidden -mx-5 sm:-mx-8 -mt-8 -mb-8 min-h-dvh flex flex-col bg-background">
      <MobileHeader
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        entryCountsByDay={entryCountsByDay}
      />
      <DateStrip
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        entryCountsByDay={entryCountsByDay}
        windowStart={windowStart}
        windowEnd={windowEnd}
      />
      <div className="flex-1">
        {windowEntries === null ? (
          <div className="py-16 text-center text-muted">Wczytuję wpisy…</div>
        ) : (
          <MobileEntryList
            entries={windowEntries}
            selectedDay={selectedDay}
            recording={composerRecording}
            onMicTap={handleMicTap}
          />
        )}
      </div>
      {/* Fixed bottom: DayNavBar + ComposerBar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border">
        <DayNavBar selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        <ComposerBar
          ref={composerRef}
          variant="mobile"
          selectedDay={selectedDay}
          onRecordingChange={setComposerRecording}
        />
      </div>
    </div>
  );

  return (
    <AppShell wide>
      <div className="fixed bottom-3 right-4 z-20 text-[10px] uppercase tracking-[0.18em] text-muted/70 font-mono pointer-events-none select-none hidden lg:block">
        v{APP_VERSION}
      </div>
      {mobileView}
      <HistorySplit
        list={desktopList}
        preview={<HistoryPreviewPane selectedId={selectedId || null} />}
      />
      <ComposerBar variant="desktop" selectedDay={todayIso} />
    </AppShell>
  );
}
