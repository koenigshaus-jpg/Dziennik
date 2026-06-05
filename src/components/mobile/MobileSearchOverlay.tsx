"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  X,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  listEntries,
  listAllTagsWithCount,
  type ClientEntry,
} from "@/lib/db-supabase";
import { MOODS, MOOD_BY_KEY } from "@/lib/moods";
import {
  formatShortPL,
  parseIsoLocalDate,
  startOfDayLocal,
  endOfDayLocal,
  toIsoLocalDate,
} from "@/lib/dates";

function parseLocalDateStart(iso: string): number | undefined {
  const d = parseIsoLocalDate(iso);
  return d ? startOfDayLocal(d).getTime() : undefined;
}

function parseLocalDateEnd(iso: string): number | undefined {
  const d = parseIsoLocalDate(iso);
  return d ? endOfDayLocal(d).getTime() : undefined;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Preset = "today" | "week" | "month" | "30d";

function applyPreset(p: Preset): { from: string; to: string } {
  const now = new Date();
  const today = toIsoLocalDate(now);
  if (p === "today") return { from: today, to: today };
  if (p === "week") {
    const dow = now.getDay(); // 0=ndz
    const back = (dow + 6) % 7; // do poniedziałku
    const start = new Date(now);
    start.setDate(start.getDate() - back);
    return { from: toIsoLocalDate(start), to: today };
  }
  if (p === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toIsoLocalDate(start), to: today };
  }
  // 30d
  const start = new Date(now);
  start.setDate(start.getDate() - 29);
  return { from: toIsoLocalDate(start), to: today };
}

function previewText(text: string, max = 140): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).trimEnd() + "…";
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const lq = q.toLowerCase();
  const idx = lower.indexOf(lq);
  if (idx < 0) return text;
  // Wytnij okno wokół trafienia
  const radius = 50;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  const before = (start > 0 ? "…" : "") + text.slice(start, idx);
  const hit = text.slice(idx, idx + q.length);
  const after =
    text.slice(idx + q.length, end) + (end < text.length ? "…" : "");
  return (
    <>
      {before}
      <mark className="bg-yellow-200/70 dark:bg-yellow-500/30 text-foreground rounded px-0.5">
        {hit}
      </mark>
      {after}
    </>
  );
}

function groupByDay(entries: ClientEntry[]): Array<{
  dayIso: string;
  label: string;
  items: ClientEntry[];
}> {
  const map = new Map<string, ClientEntry[]>();
  for (const e of entries) {
    const iso = toIsoLocalDate(new Date(e.createdAt));
    const arr = map.get(iso) ?? [];
    arr.push(e);
    map.set(iso, arr);
  }
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([iso, items]) => ({
      dayIso: iso,
      label: formatShortPL(new Date(items[0].createdAt)),
      items,
    }));
}

export function MobileSearchOverlay({ open, onOpenChange }: Props) {
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [selectedMoods, setSelectedMoods] = React.useState<string[]>([]);
  const [tag, setTag] = React.useState<string>("");
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");
  const [filtersExpanded, setFiltersExpanded] = React.useState(false);
  const [results, setResults] = React.useState<ClientEntry[] | null>(null);
  const [allTags, setAllTags] = React.useState<{ name: string; count: number }[]>(
    []
  );
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // Reset przy zamknięciu
  React.useEffect(() => {
    if (!open) return;
    // Załaduj tagi raz przy otwarciu
    let cancelled = false;
    (async () => {
      try {
        const ts = await listAllTagsWithCount();
        if (!cancelled) setAllTags(ts);
      } catch (e) {
        console.error(e);
      }
    })();
    // Focus z małym opóźnieniem (czeka aż radix doda content)
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open]);

  // Debounce query
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query]);

  const activeFilterCount =
    (debouncedQuery ? 1 : 0) +
    (tag ? 1 : 0) +
    (from || to ? 1 : 0) +
    selectedMoods.length;

  const hasAnyInput = activeFilterCount > 0;

  // Fetch wyników
  React.useEffect(() => {
    if (!open) return;
    if (!hasAnyInput) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const fromMs = from ? parseLocalDateStart(from) : undefined;
    const toMs = to ? parseLocalDateEnd(to) : undefined;
    (async () => {
      try {
        const es = await listEntries({
          q: debouncedQuery || undefined,
          tag: tag || undefined,
          from: fromMs ?? undefined,
          to: toMs ?? undefined,
          moods: selectedMoods.length > 0 ? selectedMoods : undefined,
        });
        if (!cancelled) {
          setResults(es);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setResults([]);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery, tag, from, to, selectedMoods, hasAnyInput]);

  function clearAll() {
    setQuery("");
    setDebouncedQuery("");
    setSelectedMoods([]);
    setTag("");
    setFrom("");
    setTo("");
    inputRef.current?.focus();
  }

  function toggleMood(key: string) {
    setSelectedMoods((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const topTags = React.useMemo(
    () => allTags.slice(0, 12),
    [allTags]
  );

  const grouped = React.useMemo(
    () => (results ? groupByDay(results) : []),
    [results]
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-0 z-50 bg-background flex flex-col lg:hidden",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Wyszukiwanie i filtrowanie wpisów
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Wpisz frazę lub użyj filtrów, aby przeszukać wpisy.
          </DialogPrimitive.Description>

          {/* Sticky top: back + input */}
          <div className="sticky top-0 z-10 bg-background border-b border-border">
            <div className="flex items-center gap-2 px-2 h-14">
              <DialogPrimitive.Close
                className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground/5"
                aria-label="Zamknij"
              >
                <ArrowLeft className="h-5 w-5" />
              </DialogPrimitive.Close>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
                <input
                  ref={inputRef}
                  type="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Szukaj w treści…"
                  className="w-full h-10 rounded-full bg-foreground/[0.04] border-0 outline-none focus:ring-2 focus:ring-foreground/10 text-sm pl-9 pr-9 placeholder:text-muted/70 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    aria-label="Wyczyść"
                    className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-foreground/5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFiltersExpanded((v) => !v)}
                aria-expanded={filtersExpanded}
                aria-label="Filtry"
                className={cn(
                  "relative inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground/5",
                  filtersExpanded && "bg-foreground/5"
                )}
              >
                <SlidersHorizontal className="h-5 w-5" />
                {activeFilterCount - (debouncedQuery ? 1 : 0) > 0 && (
                  <span className="absolute top-1 right-1 inline-flex h-4 min-w-4 items-center justify-center px-1 rounded-full bg-foreground text-background text-[10px] font-semibold leading-none tabular-nums">
                    {activeFilterCount - (debouncedQuery ? 1 : 0)}
                  </span>
                )}
              </button>
            </div>

            {/* Aktywne chipsy (zawsze widoczne gdy są) */}
            {(tag ||
              from ||
              to ||
              selectedMoods.length > 0) && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                {selectedMoods.map((k) => {
                  const m = MOOD_BY_KEY[k];
                  if (!m) return null;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => toggleMood(k)}
                      className="inline-flex items-center gap-1 h-7 pl-2 pr-1 rounded-full bg-foreground text-background text-xs"
                    >
                      <span className="text-sm leading-none">{m.emoji}</span>
                      <span>{m.label}</span>
                      <X className="h-3 w-3 opacity-80" />
                    </button>
                  );
                })}
                {tag && (
                  <button
                    type="button"
                    onClick={() => setTag("")}
                    className="inline-flex items-center gap-1 h-7 pl-2 pr-1 rounded-full bg-foreground text-background text-xs"
                  >
                    #{tag}
                    <X className="h-3 w-3 opacity-80" />
                  </button>
                )}
                {(from || to) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFrom("");
                      setTo("");
                    }}
                    className="inline-flex items-center gap-1 h-7 pl-2 pr-1 rounded-full bg-foreground text-background text-xs"
                  >
                    {from
                      ? formatShortPL(new Date(parseLocalDateStart(from)!))
                      : "…"}
                    {" – "}
                    {to
                      ? formatShortPL(new Date(parseLocalDateEnd(to)!))
                      : "…"}
                    <X className="h-3 w-3 opacity-80" />
                  </button>
                )}
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex items-center h-7 px-2 rounded-full text-xs text-muted hover:bg-foreground/5"
                  >
                    Wyczyść wszystko
                  </button>
                )}
              </div>
            )}

            {/* Rozwijany panel filtrów */}
            {filtersExpanded && (
              <div className="border-t border-border bg-foreground/[0.02] px-3 py-3 flex flex-col gap-4 max-h-[55vh] overflow-y-auto">
                {/* Zakres dat */}
                <section className="flex flex-col gap-2">
                  <h3 className="text-[11px] uppercase tracking-wider text-muted">
                    Zakres dat
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["today", "Dziś"],
                        ["week", "Ten tydzień"],
                        ["month", "Ten miesiąc"],
                        ["30d", "Ostatnie 30 dni"],
                      ] as Array<[Preset, string]>
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          const r = applyPreset(k);
                          setFrom(r.from);
                          setTo(r.to);
                        }}
                        className="h-8 px-3 rounded-full border border-border text-xs hover:bg-foreground/5"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <label className="inline-flex items-center gap-1.5 text-xs">
                      <span className="text-muted">Od</span>
                      <input
                        type="date"
                        value={from}
                        max={to || undefined}
                        onChange={(e) => setFrom(e.target.value)}
                        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                      />
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs">
                      <span className="text-muted">Do</span>
                      <input
                        type="date"
                        value={to}
                        min={from || undefined}
                        onChange={(e) => setTo(e.target.value)}
                        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                      />
                    </label>
                  </div>
                </section>

                {/* Nastrój */}
                <section className="flex flex-col gap-2">
                  <h3 className="text-[11px] uppercase tracking-wider text-muted">
                    Nastrój
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {MOODS.map((m) => {
                      const active = selectedMoods.includes(m.key);
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => toggleMood(m.key)}
                          aria-pressed={active}
                          className={cn(
                            "inline-flex items-center gap-1 h-8 px-2.5 rounded-full border text-xs transition-colors",
                            active
                              ? "bg-foreground text-background border-foreground"
                              : "border-border hover:bg-foreground/5"
                          )}
                        >
                          <span className="text-sm leading-none">
                            {m.emoji}
                          </span>
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Tagi */}
                {topTags.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <h3 className="text-[11px] uppercase tracking-wider text-muted">
                      Tagi
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {topTags.map((t) => {
                        const active = tag === t.name;
                        return (
                          <button
                            key={t.name}
                            type="button"
                            onClick={() => setTag(active ? "" : t.name)}
                            aria-pressed={active}
                            className={cn(
                              "inline-flex items-center gap-1 h-8 px-2.5 rounded-full border text-xs transition-colors",
                              active
                                ? "bg-foreground text-background border-foreground"
                                : "border-border hover:bg-foreground/5"
                            )}
                          >
                            #{t.name}
                            <span
                              className={cn(
                                "text-[10px]",
                                active ? "opacity-80" : "text-muted"
                              )}
                            >
                              {t.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>

          {/* Wyniki */}
          <div className="flex-1 overflow-y-auto">
            {!hasAnyInput && (
              <div className="px-6 py-16 text-center text-sm text-muted">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
                Zacznij wpisywać, aby przeszukać wpisy.
                <br />
                Możesz też zawęzić filtrami powyżej.
              </div>
            )}

            {hasAnyInput && loading && results === null && (
              <div className="flex items-center justify-center py-16 text-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {hasAnyInput && results && results.length === 0 && !loading && (
              <div className="px-6 py-16 text-center text-sm text-muted">
                Brak wyników.
              </div>
            )}

            {hasAnyInput && results && results.length > 0 && (
              <div className="pb-6">
                {grouped.map((g) => (
                  <div key={g.dayIso}>
                    <div className="sticky top-0 z-[1] bg-background/95 backdrop-blur px-4 pt-3 pb-1 text-[11px] uppercase tracking-wider text-muted">
                      {g.label}
                    </div>
                    <ul>
                      {g.items.map((e) => {
                        const time = new Date(e.createdAt).toLocaleTimeString(
                          "pl-PL",
                          { hour: "2-digit", minute: "2-digit" }
                        );
                        const text = previewText(e.contentText, 200);
                        return (
                          <li key={e.id}>
                            <Link
                              href={`/wpis/${e.id}`}
                              onClick={() => onOpenChange(false)}
                              className="block px-4 py-3 border-b border-border/60 active:bg-foreground/5"
                            >
                              <div className="flex items-baseline justify-between gap-3 mb-1">
                                <span className="text-xs text-muted tabular-nums">
                                  {time}
                                </span>
                                {e.tags.length > 0 && (
                                  <span className="text-[11px] text-muted truncate">
                                    {e.tags
                                      .slice(0, 3)
                                      .map((t) => `#${t}`)
                                      .join(" ")}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm leading-snug line-clamp-3">
                                {debouncedQuery
                                  ? highlightMatch(text, debouncedQuery)
                                  : text || (
                                      <span className="text-muted italic">
                                        (pusty wpis)
                                      </span>
                                    )}
                              </div>
                              {e.mood && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {e.mood.split(",").map((k) => {
                                    const m = MOOD_BY_KEY[k.trim()];
                                    if (!m) return null;
                                    return (
                                      <span
                                        key={k}
                                        className="text-xs leading-none"
                                        aria-label={m.label}
                                      >
                                        {m.emoji}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
