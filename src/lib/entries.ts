import { db, schema, ensureSchema } from "@/db";
import { eq, desc, inArray, like, and, gte, lte, sql } from "drizzle-orm";
import { newId } from "@/lib/ids";
import { deleteBlob } from "@/lib/storage";

export interface EntryWithRelations {
  id: string;
  contentHtml: string;
  contentText: string;
  mood: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags: { id: string; name: string }[];
  media: {
    id: string;
    kind: "image" | "audio";
    path: string;
    mime: string;
    size: number;
  }[];
}

function normalizeTag(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40);
}

export async function ensureTags(names: string[]): Promise<{ id: string; name: string }[]> {
  await ensureSchema();
  const cleaned = Array.from(
    new Set(names.map(normalizeTag).filter((n) => n.length > 0))
  );
  if (cleaned.length === 0) return [];

  const existing = await db
    .select()
    .from(schema.tags)
    .where(inArray(schema.tags.name, cleaned));
  const existingNames = new Set(existing.map((t) => t.name));
  const toInsert = cleaned
    .filter((n) => !existingNames.has(n))
    .map((name) => ({ id: newId(), name }));

  if (toInsert.length > 0) {
    await db.insert(schema.tags).values(toInsert);
  }
  return [...existing, ...toInsert];
}

export async function listEntries(opts?: {
  q?: string;
  tag?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}): Promise<EntryWithRelations[]> {
  await ensureSchema();
  const limit = opts?.limit ?? 100;

  const conditions = [];
  if (opts?.q && opts.q.trim()) {
    conditions.push(like(schema.entries.contentText, `%${opts.q.trim()}%`));
  }
  if (opts?.from) conditions.push(gte(schema.entries.createdAt, opts.from));
  if (opts?.to) conditions.push(lte(schema.entries.createdAt, opts.to));

  let entryIdsFromTag: string[] | null = null;
  if (opts?.tag) {
    const tagRow = await db
      .select()
      .from(schema.tags)
      .where(eq(schema.tags.name, opts.tag.toLowerCase()))
      .get();
    if (!tagRow) return [];
    const rows = await db
      .select({ entryId: schema.entryTags.entryId })
      .from(schema.entryTags)
      .where(eq(schema.entryTags.tagId, tagRow.id));
    entryIdsFromTag = rows.map((r) => r.entryId);
    if (entryIdsFromTag.length === 0) return [];
    conditions.push(inArray(schema.entries.id, entryIdsFromTag));
  }

  const baseQuery = db
    .select()
    .from(schema.entries)
    .orderBy(desc(schema.entries.createdAt))
    .limit(limit);

  const rows = conditions.length > 0
    ? await baseQuery.where(and(...conditions))
    : await baseQuery;

  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const tagRows = await db
    .select({
      entryId: schema.entryTags.entryId,
      id: schema.tags.id,
      name: schema.tags.name,
    })
    .from(schema.entryTags)
    .innerJoin(schema.tags, eq(schema.entryTags.tagId, schema.tags.id))
    .where(inArray(schema.entryTags.entryId, ids));

  const mediaRows = await db
    .select()
    .from(schema.media)
    .where(inArray(schema.media.entryId, ids));

  const tagsByEntry = new Map<string, { id: string; name: string }[]>();
  for (const t of tagRows) {
    if (!tagsByEntry.has(t.entryId)) tagsByEntry.set(t.entryId, []);
    tagsByEntry.get(t.entryId)!.push({ id: t.id, name: t.name });
  }
  const mediaByEntry = new Map<string, EntryWithRelations["media"]>();
  for (const m of mediaRows) {
    if (!m.entryId) continue;
    if (!mediaByEntry.has(m.entryId)) mediaByEntry.set(m.entryId, []);
    mediaByEntry.get(m.entryId)!.push({
      id: m.id,
      kind: m.kind as "image" | "audio",
      path: m.path,
      mime: m.mime,
      size: m.size,
    });
  }

  return rows.map((r) => ({
    id: r.id,
    contentHtml: r.contentHtml,
    contentText: r.contentText,
    mood: r.mood,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    tags: tagsByEntry.get(r.id) ?? [],
    media: mediaByEntry.get(r.id) ?? [],
  }));
}

export async function getEntry(id: string): Promise<EntryWithRelations | null> {
  await ensureSchema();
  const row = await db
    .select()
    .from(schema.entries)
    .where(eq(schema.entries.id, id))
    .get();
  if (!row) return null;

  const tagRows = await db
    .select({ id: schema.tags.id, name: schema.tags.name })
    .from(schema.entryTags)
    .innerJoin(schema.tags, eq(schema.entryTags.tagId, schema.tags.id))
    .where(eq(schema.entryTags.entryId, id));

  const mediaRows = await db
    .select()
    .from(schema.media)
    .where(eq(schema.media.entryId, id));

  return {
    id: row.id,
    contentHtml: row.contentHtml,
    contentText: row.contentText,
    mood: row.mood,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: tagRows,
    media: mediaRows.map((m) => ({
      id: m.id,
      kind: m.kind as "image" | "audio",
      path: m.path,
      mime: m.mime,
      size: m.size,
    })),
  };
}

export async function createEntry(input: {
  contentHtml: string;
  contentText: string;
  mood: string | null;
  createdAt: Date;
  tags: string[];
  mediaIds: string[];
}): Promise<string> {
  await ensureSchema();
  const id = newId();
  const now = new Date();

  await db.insert(schema.entries).values({
    id,
    contentHtml: input.contentHtml,
    contentText: input.contentText,
    mood: input.mood,
    createdAt: input.createdAt,
    updatedAt: now,
  });

  const tagRows = await ensureTags(input.tags);
  if (tagRows.length > 0) {
    await db
      .insert(schema.entryTags)
      .values(tagRows.map((t) => ({ entryId: id, tagId: t.id })));
  }

  if (input.mediaIds.length > 0) {
    await db
      .update(schema.media)
      .set({ entryId: id })
      .where(inArray(schema.media.id, input.mediaIds));
  }

  return id;
}

export async function updateEntry(
  id: string,
  input: {
    contentHtml: string;
    contentText: string;
    mood: string | null;
    createdAt: Date;
    tags: string[];
    mediaIds: string[];
  }
): Promise<void> {
  await ensureSchema();
  const existing = await db
    .select()
    .from(schema.entries)
    .where(eq(schema.entries.id, id))
    .get();
  if (!existing) throw new Error("Wpis nie istnieje.");

  await db
    .update(schema.entries)
    .set({
      contentHtml: input.contentHtml,
      contentText: input.contentText,
      mood: input.mood,
      createdAt: input.createdAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.entries.id, id));

  await db.delete(schema.entryTags).where(eq(schema.entryTags.entryId, id));
  const tagRows = await ensureTags(input.tags);
  if (tagRows.length > 0) {
    await db
      .insert(schema.entryTags)
      .values(tagRows.map((t) => ({ entryId: id, tagId: t.id })));
  }

  // media: usuwamy te które są przypisane do wpisu, a nie ma ich w mediaIds
  const currentMedia = await db
    .select()
    .from(schema.media)
    .where(eq(schema.media.entryId, id));
  const keep = new Set(input.mediaIds);
  const toDelete = currentMedia.filter((m) => !keep.has(m.id));
  for (const m of toDelete) {
    await deleteBlob(m.path);
  }
  if (toDelete.length > 0) {
    await db
      .delete(schema.media)
      .where(inArray(schema.media.id, toDelete.map((m) => m.id)));
  }

  // przyłącz nowe media (te, które jeszcze nie mają entry_id przypisanego do tego wpisu)
  const newOnes = input.mediaIds.filter(
    (mid) => !currentMedia.some((m) => m.id === mid)
  );
  if (newOnes.length > 0) {
    await db
      .update(schema.media)
      .set({ entryId: id })
      .where(inArray(schema.media.id, newOnes));
  }
}

export async function deleteEntry(id: string): Promise<void> {
  await ensureSchema();
  const mediaRows = await db
    .select()
    .from(schema.media)
    .where(eq(schema.media.entryId, id));
  for (const m of mediaRows) {
    await deleteBlob(m.path);
  }
  await db.delete(schema.entries).where(eq(schema.entries.id, id));
}

export async function listAllTagsWithCount(): Promise<{ name: string; count: number }[]> {
  await ensureSchema();
  const rows = await db
    .select({
      name: schema.tags.name,
      count: sql<number>`count(${schema.entryTags.entryId})`,
    })
    .from(schema.tags)
    .leftJoin(schema.entryTags, eq(schema.tags.id, schema.entryTags.tagId))
    .groupBy(schema.tags.id, schema.tags.name)
    .orderBy(desc(sql`count(${schema.entryTags.entryId})`));
  return rows.map((r) => ({ name: r.name, count: Number(r.count) }));
}
