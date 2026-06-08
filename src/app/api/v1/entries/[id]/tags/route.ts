import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson, withApiHandler } from "@/lib/api/handler";
import { attachTag } from "@/lib/api/entries-repo";

export const runtime = "nodejs";

const schema = z.object({ name: z.string().min(1).max(40) });

export const POST = withApiHandler<{ id: string }>(async (req, { user, params }) => {
  const { name } = await parseJson(req, schema);
  const entry = await attachTag(user.userId, params.id, name);
  return NextResponse.json(entry);
});
