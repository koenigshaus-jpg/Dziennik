"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { getEntry, type ClientEntry, type EntriesChangedDetail } from "@/lib/db-client";
import { EntryEditor } from "@/components/entry/EntryEditor";

export function HistoryPreviewPane({ selectedId }: { selectedId: string | null }) {
  const [entry, setEntry] = useState<ClientEntry | null | undefined>(undefined);

  useEffect(() => {
    if (!selectedId) {
      setEntry(null);
      return;
    }
    let cancelled = false;
    setEntry(undefined);
    (async () => {
      try {
        const e = await getEntry(selectedId);
        if (!cancelled) setEntry(e);
      } catch (err) {
        console.error(err);
        if (!cancelled) setEntry(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    function onChanged(e: Event) {
      const detail = (e as CustomEvent<EntriesChangedDetail>).detail;
      if (detail.id !== selectedId) return;
      if (detail.kind === "delete") {
        setEntry(null);
        return;
      }
      if (detail.kind === "update") return;
      getEntry(selectedId!).then((x) => setEntry(x)).catch(() => {});
    }
    window.addEventListener("entries-changed", onChanged);
    return () => window.removeEventListener("entries-changed", onChanged);
  }, [selectedId]);

  if (!selectedId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted px-8 text-center">
        <BookOpen className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-lg">Wybierz wpis z listy</p>
        <p className="text-sm mt-1 opacity-70">Podgląd pojawi się tutaj.</p>
      </div>
    );
  }

  if (entry === undefined) {
    return <div className="p-8 text-muted">Wczytuję…</div>;
  }

  if (entry === null) {
    return <div className="p-8 text-muted">Nie znaleziono wpisu.</div>;
  }

  return (
    <div className="py-8 pl-10 pr-6 min-h-full flex flex-col">
      <EntryEditor
        entry={entry}
        onUpdated={(fresh) => setEntry(fresh)}
        bodyClassName="max-w-3xl"
      />
    </div>
  );
}
