"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
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
          onClick={() => router.push("/historia")}
          className="mt-4 underline"
        >
          Wróć do historii
        </button>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <EntryEditor
        entry={entry}
        onUpdated={(fresh) => setEntry(fresh)}
        onDeleted={() => router.push("/historia")}
      />
    </AppShell>
  );
}
