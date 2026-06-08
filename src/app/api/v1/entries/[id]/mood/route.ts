import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson, withApiHandler } from "@/lib/api/handler";
import { setMood } from "@/lib/api/entries-repo";

export const runtime = "nodejs";

const schema = z.object({ mood: z.string().nullable() });

export const PATCH = withApiHandler<{ id: string }>(async (req, { user, params }) => {
  const { mood } = await parseJson(req, schema);
  const entry = await setMood(user.userId, params.id, mood);
  return NextResponse.json(entry);
});
