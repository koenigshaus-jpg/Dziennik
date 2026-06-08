import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson, withApiHandler } from "@/lib/api/handler";
import { createEntry, listEntries } from "@/lib/api/entries-repo";
import { isIsoDate, todayInWarsaw } from "@/lib/api/dates";

export const runtime = "nodejs";

const createSchema = z.object({
  text: z.string().min(1, "Treść jest wymagana."),
  html: z.string().optional(),
  mood: z.string().nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).optional(),
  /** ISO8601 timestamp lub YYYY-MM-DD (przelicza się na 12:00 Europe/Warsaw). */
  created_at: z.string().min(1).optional(),
});

/** YYYY-MM-DD → 12:00 lokalnego czasu Warszawy z odpowiednim offsetem (CEST/CET). */
function isoDateToWarsawNoon(date: string): string {
  const month = parseInt(date.slice(5, 7), 10);
  // Aproksymacja DST: kwiecień–październik = CEST (+02:00), reszta = CET (+01:00)
  const offset = month >= 4 && month <= 10 ? "+02:00" : "+01:00";
  return `${date}T12:00:00${offset}`;
}

export const POST = withApiHandler(async (req, { user }) => {
  const body = await parseJson(req, createSchema);

  let createdAt: string | undefined;
  if (body.created_at) {
    createdAt = isIsoDate(body.created_at)
      ? isoDateToWarsawNoon(body.created_at)
      : new Date(body.created_at).toISOString();
  }

  const entry = await createEntry(user.userId, {
    text: body.text,
    html: body.html,
    mood: body.mood ?? null,
    tags: body.tags ?? [],
    createdAt,
  });
  return NextResponse.json(entry, { status: 201 });
});

export const GET = withApiHandler(async (req, { user }) => {
  const url = new URL(req.url);
  const day = url.searchParams.get("day");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const tag = url.searchParams.get("tag");
  const mood = url.searchParams.get("mood");
  const limitParam = url.searchParams.get("limit");

  // Domyślnie filtr po dniu = dzisiaj. Jeśli podany from/to, pomijamy day.
  const filters = {
    day: day ?? (from || to ? undefined : todayInWarsaw()),
    from: from ?? undefined,
    to: to ?? undefined,
    tag: tag ?? undefined,
    mood: mood ?? undefined,
    limit: limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50,
  };

  const entries = await listEntries(user.userId, filters);
  return NextResponse.json({ entries, filters });
});
