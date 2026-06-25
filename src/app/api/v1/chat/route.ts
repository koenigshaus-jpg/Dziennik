import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJson, withApiHandler, ApiError } from "@/lib/api/handler";
import {
  appendMessages,
  createConversation,
  getConversation,
  getLastPersona,
  listMessages,
  setLastPersona,
} from "@/lib/api/chat-repo";
import { hybridSearchEntries } from "@/lib/api/hybrid-search";
import { todayInWarsaw } from "@/lib/api/dates";
import {
  buildSystemPrompt,
  getChatProvider,
  PERSONAS,
  PERSONA_ORDER,
} from "@/lib/agent";
import { resolvePersona } from "@/lib/agent/persona-source";
import {
  FREE_PERSONA_KEYS,
  isPersonaUnlocked,
  parseEntitlements,
  type EntitlementRow,
} from "@/lib/agent/entitlements";
import { getPersonaOverrides } from "@/lib/woocommerce";
import type { PersonaKey } from "@/lib/agent/types";
import { getSupabaseAdmin } from "@/lib/api/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  text: z.string().min(1, "Treść wiadomości jest wymagana."),
  conversation_id: z.string().uuid().optional(),
  persona_key: z.string().optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  deep_mode: z.boolean().optional(),
});

export const POST = withApiHandler(async (req, { user }) => {
  if (!process.env.OPENAI_API_KEY) {
    throw new ApiError("openai_not_configured", 500);
  }

  const body = await parseJson(req, schema);
  const day = body.day ?? todayInWarsaw();

  // 1) Konwersacja: nowa lub istniejąca
  let conversation;
  let history: { role: "user" | "assistant"; content: string }[] = [];

  if (body.conversation_id) {
    conversation = await getConversation(user.userId, body.conversation_id);
    const msgs = await listMessages(conversation.id);
    history = msgs.map((m) => ({ role: m.role, content: m.content }));
  } else {
    const fallback = (await getLastPersona(user.userId)) ?? PERSONA_ORDER[0];
    const personaKey = body.persona_key && PERSONAS[body.persona_key as keyof typeof PERSONAS]
      ? body.persona_key
      : fallback;
    if (!PERSONAS[personaKey as keyof typeof PERSONAS]) {
      throw new ApiError("unknown_persona_key", 400, { allowed: PERSONA_ORDER });
    }
    conversation = await createConversation(user.userId, personaKey);
  }

  // Gating: płatna persona (cena > 0 w WC) wymaga aktywnego uprawnienia.
  const pkey = conversation.persona_key as PersonaKey;
  let isFree = FREE_PERSONA_KEYS.has(pkey);
  try {
    const ovr = (await getPersonaOverrides()).get(pkey);
    if (ovr) isFree = Number(ovr.price) === 0;
  } catch {
    /* fallback do FREE_PERSONA_KEYS */
  }
  if (!isFree) {
    const { data: ents } = await getSupabaseAdmin()
      .from("entitlements")
      .select("sku,status,current_period_end")
      .eq("user_id", user.userId);
    const ent = parseEntitlements((ents ?? []) as EntitlementRow[]);
    if (!isPersonaUnlocked(pkey, false, ent)) {
      throw new ApiError("persona_locked", 402, {
        persona_key: conversation.persona_key,
      });
    }
  }

  const persona = await resolvePersona(conversation.persona_key);

  // 2) Retrieval: hybrydowe wyszukiwanie wpisów pod treść pytania (server-side)
  const retrieved = await hybridSearchEntries(user.userId, body.text, { day });
  const systemPrompt = buildSystemPrompt({ persona, day, retrieved });

  // 3) Zbuduj messages do modelu — historia + nowa wiadomość usera
  // Format zgodny z UIMessageInput (tablice parts) — tak woła to provider
  type UIMessage = {
    id: string;
    role: "user" | "assistant";
    parts: Array<{ type: "text"; text: string }>;
  };
  const uiMessages: UIMessage[] = [
    ...history.map((m, i) => ({
      id: `h${i}`,
      role: m.role,
      parts: [{ type: "text" as const, text: m.content }],
    })),
    { id: "new", role: "user", parts: [{ type: "text", text: body.text }] },
  ];

  const model = body.deep_mode ? persona.deepModel : persona.defaultModel;

  // 4) Generuj odpowiedź (non-streaming)
  const result = await getChatProvider().generateChat({
    systemPrompt,
    messages: uiMessages,
    model,
    temperature: persona.temperature,
    abortSignal: req.signal,
  });

  // 5) Persystencja: user msg + assistant msg, update last_persona
  const [, assistantRow] = await appendMessages(conversation.id, [
    { role: "user", content: body.text },
    { role: "assistant", content: result.content },
  ]);
  await setLastPersona(user.userId, conversation.persona_key);

  return NextResponse.json({
    conversation_id: conversation.id,
    persona_key: conversation.persona_key,
    message: {
      id: assistantRow.id,
      role: assistantRow.role,
      content: assistantRow.content,
      created_at: assistantRow.created_at,
    },
    model_used: result.model,
  });
});
