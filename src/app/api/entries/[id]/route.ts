import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session-server";
import { deleteEntry, getEntry, updateEntry } from "@/lib/entries";
import { htmlToText } from "@/lib/text";

export const runtime = "nodejs";

const patchSchema = z.object({
  contentHtml: z.string().min(1),
  mood: z.string().nullable().optional(),
  createdAt: z.string().min(1).optional(),
  tags: z.array(z.string()).default([]),
  mediaIds: z.array(z.string()).default([]),
});

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
  } catch (r) {
    return r as Response;
  }
  const { id } = await ctx.params;
  const entry = await getEntry(id);
  if (!entry) return NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });
  return NextResponse.json({ entry });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
  } catch (r) {
    return r as Response;
  }
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Nieprawidłowe dane." },
      { status: 400 }
    );
  }
  const data = parsed.data;
  const contentText = htmlToText(data.contentHtml);
  if (!contentText.trim()) {
    return NextResponse.json({ error: "Wpis nie może być pusty." }, { status: 400 });
  }
  const createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
  if (isNaN(createdAt.getTime())) {
    return NextResponse.json({ error: "Nieprawidłowa data." }, { status: 400 });
  }

  try {
    await updateEntry(id, {
      contentHtml: data.contentHtml,
      contentText,
      mood: data.mood ?? null,
      createdAt,
      tags: data.tags,
      mediaIds: data.mediaIds,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Błąd aktualizacji." },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
  } catch (r) {
    return r as Response;
  }
  const { id } = await ctx.params;
  await deleteEntry(id);
  return NextResponse.json({ ok: true });
}
