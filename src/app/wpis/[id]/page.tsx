"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EntryEditor } from "@/components/entry/EntryEditor";
import { getEntry, type ClientEntry, type EntriesChangedDetail } from "@/lib/db-supabase";

export default function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [entry, setEntry] = useState<ClientEntry | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const e = await getEntry(id);
        if (!cancelled) setEntry(e);
      } catch (err) {
        console.error(err);
        if (!cancelled) setEntry(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    function onChanged(e: Event) {
      const detail = (e as CustomEvent<EntriesChangedDetail>).detail;
      if (detail.id !== id) return;
      if (detail.kind === "delete") setEntry(null);
    }
    window.addEventListener("entries-changed", onChanged);
    return () => window.removeEventListener("entries-changed", onChanged);
  }, [id]);

  if (entry === undefined) {
    return (
      <AppShell>
        <p className="text-muted">Wczytuję…</p>
      </AppShell>
    );
  }

  if (entry === null) {
    return (
      <AppShell>
        <p className="text-muted">Nie znaleziono wpisu.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 underline"
        >
          Wróć do dziennika
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <EntryPageContent
        entry={entry}
        onUpdated={(fresh) => setEntry(fresh)}
        onBack={() => router.push("/")}
      />
    </AppShell>
  );
}

function EntryPageContent({
  entry,
  onUpdated,
  onBack,
}: {
  entry: ClientEntry;
  onUpdated: (fresh: ClientEntry) => void;
  onBack: () => void;
}) {
  // Swipe right → back to journal
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  return (
    <div
      onTouchStart={(e) => {
        swipeRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }}
      onTouchEnd={(e) => {
        const start = swipeRef.current;
        swipeRef.current = null;
        if (!start) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        // Tylko swipe right (poziomy, znaczący)
        if (dx > 80 && Math.abs(dy) < Math.abs(dx) / 1.5 && start.x < 40) {
          // edge-swipe: tylko gdy zaczęliśmy blisko lewej krawędzi
          onBack();
        }
      }}
    >
      <div className="lg:hidden flex items-center gap-1 -mx-5 sm:-mx-8 px-2 mb-2 h-12 sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border">
        <button
          type="button"
          onClick={onBack}
          aria-label="Wróć do dziennika"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-foreground/5"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold tracking-wide">Wpis</span>
      </div>
      <EntryEditor
        entry={entry}
        onUpdated={onUpdated}
        onDeleted={onBack}
      />
    </div>
  );
}
