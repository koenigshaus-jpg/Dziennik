import { NextResponse } from "next/server";
import { z } from "zod";
import { tool } from "ai";

import { parseJson, withApiHandler, ApiError } from "@/lib/api/handler";
import {
  appendMessages,
  createConversation,
  getConversation,
  getLastPersona,
  listMessages,
  setLastPersona,
} from "@/lib/api/chat-repo";
import { buildChatContext, fetchEntryServer } from "@/lib/api/chat-context";
import { todayInWarsaw } from "@/lib/api/dates";
import {
  buildSystemPrompt,
  getChatProvider,
  getPersona,
  PERSONAS,
  PERSONA_ORDER,
} from "@/lib/agent";

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

  const persona = getPersona(conversation.persona_key);

  // 2) Kontekst dnia + indeks pozostałych — server-side z Supabase
  const { dayEntries, entriesIndex } = await buildChatContext(user.userId, day);
  const systemPrompt = buildSystemPrompt({ persona, day, dayEntries, entriesIndex });

  // 3) Tool fetchEntry — server-executed (klient nie ma dostępu do DB usera)
  const tools = {
    fetchEntry: tool({
      description:
        "Pobiera pełną treść wpisu z dziennika po id (id z indeksu w system prompcie).",
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }: { id: string }) => {
        const entry = await fetchEntryServer(user.userId, id);
        if (!entry) return { error: "not_found" };
        return entry;
      },
    }),
  };

  // 4) Zbuduj messages do modelu — historia + nowa wiadomość usera
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

  // 5) Generuj odpowiedź (non-streaming)
  const result = await getChatProvider().generateChat({
    systemPrompt,
    messages: uiMessages,
    model,
    temperature: persona.temperature,
    tools,
    abortSignal: req.signal,
  });

  // 6) Persystencja: user msg + assistant msg, update last_persona
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
