import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EntryDetail } from "@/components/entry/EntryDetail";
import { getEntry } from "@/lib/entries";

export default async function EntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getEntry(id);
  if (!entry) notFound();

  return (
    <AppShell>
      <EntryDetail
        entry={{
          id: entry.id,
          contentHtml: entry.contentHtml,
          mood: entry.mood,
          createdAt: entry.createdAt.toISOString(),
          tags: entry.tags,
          media: entry.media,
        }}
      />
    </AppShell>
  );
}
