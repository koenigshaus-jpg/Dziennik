"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EntryDetail } from "@/components/entry/EntryDetail";
import { getEntry, type ClientEntry } from "@/lib/db-client";

export default function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [entry, setEntry] = useState<ClientEntry | null | undefined>(undefined);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [id, reloadKey]);

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
      <EntryDetail
        entry={{
          id: entry.id,
          contentHtml: entry.contentHtml,
          mood: entry.mood,
          createdAt: new Date(entry.createdAt).toISOString(),
          tags: entry.tags.map((name) => ({ id: name, name })),
          media: entry.media,
        }}
        onChanged={() => setReloadKey((k) => k + 1)}
      />
    </AppShell>
  );
}
