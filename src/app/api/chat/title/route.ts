import { NextResponse } from "next/server";

import {
  getChatProvider,
  type ChatTitleRequestPayload,
  type ChatTitleResponse,
} from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 30;

const TITLE_MODEL = "gpt-4o-mini";

function isValidPayload(value: unknown): value is ChatTitleRequestPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.firstUserMessage === "string" &&
    typeof v.firstAssistantMessage === "string"
  );
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Brak OPENAI_API_KEY na serwerze." },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Niepoprawny JSON." }, { status: 400 });
  }

  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "Niepoprawny payload." },
      { status: 400 }
    );
  }

  try {
    const title = await getChatProvider().generateTitle({
      model: TITLE_MODEL,
      firstUserMessage: body.firstUserMessage,
      firstAssistantMessage: body.firstAssistantMessage,
    });
    const response: ChatTitleResponse = { title };
    return NextResponse.json(response);
  } catch (e) {
    console.error("/api/chat/title error:", e);
    return NextResponse.json(
      { error: "Nie udało się wygenerować tytułu." },
      { status: 502 }
    );
  }
}
