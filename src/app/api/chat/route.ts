import { NextResponse } from "next/server";

import {
  agentTools,
  buildSystemPrompt,
  getChatProvider,
  getPersona,
  type ChatRequestPayload,
  type PersonaKey,
} from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

function isValidPayload(value: unknown): value is ChatRequestPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.messages) &&
    typeof v.personaKey === "string" &&
    typeof v.deepMode === "boolean" &&
    typeof v.day === "string" &&
    Array.isArray(v.dayEntries) &&
    Array.isArray(v.entriesIndex)
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

  const persona = getPersona(body.personaKey as PersonaKey);

  console.log(
    `[/api/chat] day=${body.day} persona=${body.personaKey} ` +
      `dayEntries=${body.dayEntries.length} entriesIndex=${body.entriesIndex.length} ` +
      `messages=${body.messages.length}`
  );

  const systemPrompt = buildSystemPrompt({
    persona,
    day: body.day,
    dayEntries: body.dayEntries,
    entriesIndex: body.entriesIndex,
  });

  const model = body.deepMode ? persona.deepModel : persona.defaultModel;

  try {
    return getChatProvider().streamChat({
      systemPrompt,
      messages: body.messages,
      model,
      temperature: persona.temperature,
      tools: agentTools as unknown as Record<string, unknown>,
      abortSignal: req.signal,
    });
  } catch (e) {
    console.error("/api/chat error:", e);
    return NextResponse.json(
      { error: "Błąd komunikacji z modelem." },
      { status: 502 }
    );
  }
}
