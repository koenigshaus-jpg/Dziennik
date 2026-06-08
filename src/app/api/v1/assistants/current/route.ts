import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson, withApiHandler, ApiError } from "@/lib/api/handler";
import { getLastPersona, setLastPersona } from "@/lib/api/chat-repo";
import { PERSONAS, PERSONA_ORDER, getPersona } from "@/lib/agent";

export const runtime = "nodejs";

const putSchema = z.object({ persona_key: z.string().min(1) });

function publicShape(key: string) {
  const p = getPersona(key);
  return {
    key: p.key,
    name: p.name,
    description: p.description,
    default_model: p.defaultModel,
    deep_model: p.deepModel,
  };
}

export const GET = withApiHandler(async (_req, { user }) => {
  const last = await getLastPersona(user.userId);
  const key = last && PERSONAS[last as keyof typeof PERSONAS] ? last : PERSONA_ORDER[0];
  return NextResponse.json({ current: publicShape(key) });
});

export const PUT = withApiHandler(async (req, { user }) => {
  const { persona_key } = await parseJson(req, putSchema);
  if (!PERSONAS[persona_key as keyof typeof PERSONAS]) {
    throw new ApiError("unknown_persona_key", 400, { allowed: PERSONA_ORDER });
  }
  await setLastPersona(user.userId, persona_key);
  return NextResponse.json({ current: publicShape(persona_key) });
});
