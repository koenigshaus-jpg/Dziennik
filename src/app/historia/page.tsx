"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  listEntries,
  listAllTagsWithCount,
  type ClientEntry,
} from "@/lib/db-client";
import { formatLongPL, formatTimePL } from "@/lib/dates";
import { snippet } from "@/lib/text";
import { parseMoods } from "@/lib/moods";
import { Image as ImageIcon, Mic, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function HistoryPage() {
  return (
    <Suspense fallback={<AppShell><p className="text-muted">Wczytuję…</p></AppShell>}>
      <HistoryPageInner />
    </Suspense>
  );
}

function HistoryPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q")?.trim() || "";
  const tag = params.get("tag") || "";

  const [entries, setEntries] = useState<ClientEntry[] | null>(null);
  const [allTags, setAllTags] = useState<{ name: string; count: number }[]>([]);
  const [searchDraft, setSearchDraft] = useState(q);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [es, ts] = await Promise.all([
          listEntries({ q: q || undefined, tag: tag || undefined }),
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
  }, [q, tag]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (searchDraft) sp.set("q", searchDraft);
    if (tag) sp.set("tag", tag);
    router.push(`/historia${sp.toString() ? `?${sp}` : ""}`);
  }

  const topTags = useMemo(
    () => allTags.filter((t) => t.count > 0).slice(0, 12),
    [allTags]
  );
  const hasFilters = !!(q || tag);
  const count = entries?.length ?? 0;
  const loading = entries === null;

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight">
          Historia
        </h1>
        <p className="text-muted mt-2">
          {loading
            ? "Wczytuję…"
            : count === 0 && !hasFilters
            ? "Jeszcze nic tu nie ma. Napisz pierwszy wpis."
            : `${count} ${
                count === 1
                  ? "wpis"
                  : count >= 2 && count <= 4
                  ? "wpisy"
                  : "wpisów"
              }`}
        </p>
      </header>

      <form onSubmit={submitSearch} className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
        <Input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Szukaj w treści…"
          className="pl-10"
        />
      </form>

      {topTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tag && (
            <Link
              href={{ pathname: "/historia", query: q ? { q } : {} }}
              className="inline-flex items-center gap-1 rounded-full bg-foreground text-background px-3 py-1 text-sm"
            >
              #{tag} <X className="h-3 w-3" />
            </Link>
          )}
          {!tag &&
            topTags.map((t) => (
              <Link
                key={t.name}
                href={{
                  pathname: "/historia",
                  query: { ...(q ? { q } : {}), tag: t.name },
                }}
                className="inline-flex items-center gap-1 rounded-full bg-foreground/5 hover:bg-foreground/10 px-3 py-1 text-sm"
              >
                #{t.name}
                <span className="text-muted text-xs">{t.count}</span>
              </Link>
            ))}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-muted">Wczytuję wpisy…</div>
      ) : count === 0 ? (
        <div className="py-16 text-center text-muted">
          {hasFilters ? "Brak wpisów pasujących do filtra." : null}
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {entries!.map((e) => {
            const date = new Date(e.createdAt);
            const moods = parseMoods(e.mood);
            const hasImages = e.media.some((m) => m.kind === "image");
            const hasAudio = e.media.some((m) => m.kind === "audio");
            return (
              <li key={e.id}>
                <Link
                  href={`/wpis/${e.id}`}
                  className="block py-5 group hover:bg-foreground/[0.02] -mx-5 px-5 sm:-mx-8 sm:px-8 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className="font-display text-xl font-semibold tracking-tight">
                      {formatLongPL(date)}
                    </span>
                    <span className="text-xs text-muted shrink-0">
                      {formatTimePL(date)}
                    </span>
                  </div>
                  {e.contentText && (
                    <p className="text-foreground/80 leading-relaxed">
                      {snippet(e.contentText, 180)}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-muted text-xs flex-wrap">
                    {moods.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        {moods.map((m) => (
                          <span key={m.key} title={m.label}>
                            {m.emoji}
                          </span>
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
                      <span key={t} className="text-muted">
                        #{t}
                      </span>
                    ))}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
