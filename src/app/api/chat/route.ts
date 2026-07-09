import { NextResponse } from "next/server";

import {
  buildSystemPrompt,
  getChatProvider,
  type ChatRequestPayload,
  type PersonaKey,
} from "@/lib/agent";
import { resolvePersona } from "@/lib/agent/persona-source";
import {
  FREE_PERSONA_KEYS,
  isPersonaUnlocked,
  parseEntitlements,
  type EntitlementRow,
} from "@/lib/agent/entitlements";
import { getPersonaOverrides } from "@/lib/woocommerce";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { hybridSearchEntries } from "@/lib/api/hybrid-search";

export const runtime = "nodejs";
export const maxDuration = 60;

function isValidPayload(value: unknown): value is ChatRequestPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.messages) &&
    typeof v.personaKey === "string" &&
    typeof v.deepMode === "boolean" &&
    typeof v.day === "string"
  );
}

/** Wyciąga tekst ostatniej wiadomości użytkownika (UIMessage z parts[]). */
function lastUserText(messages: unknown[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i] as { role?: string; parts?: unknown[] };
    if (m?.role !== "user") continue;
    const parts = Array.isArray(m.parts) ? m.parts : [];
    return parts
      .filter(
        (p): p is { type: string; text: string } =>
          !!p &&
          typeof (p as { type?: unknown }).type === "string" &&
          (p as { type: string }).type === "text"
      )
      .map((p) => p.text)
      .join("")
      .trim();
  }
  return "";
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
    return NextResponse.json({ error: "Niepoprawny payload." }, { status: 400 });
  }

  // Tożsamość użytkownika z sesji (cookies). /api/chat jest za auth (proxy.ts).
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niezalogowany." }, { status: 401 });
  }

  // Gating: płatna persona (cena > 0 w WC) wymaga aktywnego uprawnienia. Darmowe
  // (cena 0) przechodzą bez zapytania. Chroni przed obejściem blokady w UI.
  const personaKey = body.personaKey as PersonaKey;
  let isFree = FREE_PERSONA_KEYS.has(personaKey);
  try {
    const ovr = (await getPersonaOverrides()).get(personaKey);
    if (ovr) isFree = Number(ovr.price) === 0;
  } catch {
    /* WC niedostępne → zostaje fallback FREE_PERSONA_KEYS */
  }
  if (!isFree) {
    const { data: ents } = await supabase
      .from("entitlements")
      .select("sku,status,current_period_end");
    const ent = parseEntitlements((ents ?? []) as EntitlementRow[]);
    if (!isPersonaUnlocked(personaKey, false, ent)) {
      return NextResponse.json(
        { error: "persona_locked", personaKey },
        { status: 402 },
      );
    }
  }

  const persona = await resolvePersona(personaKey);

  // Retrieval: hybrydowe wyszukiwanie wpisów pod ostatnie pytanie użytkownika.
  // Nieobowiązkowe — gdy padnie (np. brak SUPABASE_SECRET_KEY, błąd RPC), czat
  // odpowiada dalej bez kontekstu wpisów zamiast wywalać całą rozmowę.
  const query = lastUserText(body.messages);
  let retrieved: Awaited<ReturnType<typeof hybridSearchEntries>> = [];
  try {
    retrieved = await hybridSearchEntries(user.id, query, { day: body.day });
  } catch (e) {
    console.error("/api/chat retrieval failed (kontynuuję bez kontekstu):", e);
  }

  console.log(
    `[/api/chat] day=${body.day} persona=${body.personaKey} ` +
      `query="${query.slice(0, 60)}" retrieved=${retrieved.length} ` +
      `messages=${body.messages.length}`
  );

  const systemPrompt = buildSystemPrompt({ persona, day: body.day, retrieved });

  const model = body.deepMode ? persona.deepModel : persona.defaultModel;

  try {
    return await getChatProvider().streamChat({
      systemPrompt,
      messages: body.messages,
      model,
      temperature: persona.temperature,
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
