import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/session-server";
import { createEntry, listEntries } from "@/lib/entries";
import { htmlToText } from "@/lib/text";

export const runtime = "nodejs";

const createSchema = z.object({
  contentHtml: z.string().min(1, "Treść jest wymagana."),
  mood: z.string().nullable().optional(),
  createdAt: z.string().datetime().or(z.string().min(1)).optional(),
  tags: z.array(z.string()).default([]),
  mediaIds: z.array(z.string()).default([]),
});

export async function POST(req: Request) {
  try {
    await requireSession();
  } catch (r) {
    return r as Response;
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
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

  const id = await createEntry({
    contentHtml: data.contentHtml,
    contentText,
    mood: data.mood ?? null,
    createdAt,
    tags: data.tags,
    mediaIds: data.mediaIds,
  });

  return NextResponse.json({ id });
}

export async function GET(req: Request) {
  try {
    await requireSession();
  } catch (r) {
    return r as Response;
  }
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || undefined;
  const tag = url.searchParams.get("tag") || undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const entries = await listEntries({
    q,
    tag,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });
  return NextResponse.json({ entries });
}
