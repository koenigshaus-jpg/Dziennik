import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson, withApiHandler } from "@/lib/api/handler";
import { deleteEntry, getEntry, updateEntry } from "@/lib/api/entries-repo";

export const runtime = "nodejs";

const updateSchema = z.object({
  text: z.string().min(1).optional(),
  html: z.string().optional(),
  mood: z.string().nullable().optional(),
  created_at: z.string().optional(),
});

export const GET = withApiHandler<{ id: string }>(async (_req, { user, params }) => {
  const entry = await getEntry(user.userId, params.id);
  return NextResponse.json(entry);
});

export const PATCH = withApiHandler<{ id: string }>(async (req, { user, params }) => {
  const body = await parseJson(req, updateSchema);
  const entry = await updateEntry(user.userId, params.id, {
    text: body.text,
    html: body.html,
    mood: body.mood,
    createdAt: body.created_at,
  });
  return NextResponse.json(entry);
});

export const DELETE = withApiHandler<{ id: string }>(async (_req, { user, params }) => {
  await deleteEntry(user.userId, params.id);
  return NextResponse.json({ deleted: true });
});
