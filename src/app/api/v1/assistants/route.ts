import { NextResponse } from "next/server";

import { withApiHandler } from "@/lib/api/handler";
import { PERSONA_ORDER, PERSONAS } from "@/lib/agent";

export const runtime = "nodejs";

export const GET = withApiHandler(async () => {
  const list = PERSONA_ORDER.map((key) => {
    const p = PERSONAS[key];
    return {
      key: p.key,
      name: p.name,
      description: p.description,
      default_model: p.defaultModel,
      deep_model: p.deepModel,
    };
  });
  return NextResponse.json({ assistants: list });
});
