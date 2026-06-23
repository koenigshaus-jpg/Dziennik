// 15 MCP tools — wrappers wokół istniejących funkcji entries-repo / chat-repo /
// chat-context. Zero duplikacji logiki — tylko adapter Zod schema → MCP content.

import { z, type ZodRawShape } from "zod";

import {
  attachTag,
  createEntry,
  deleteEntry,
  detachTag,
  getEntry,
  listEntries,
  listUserTags,
  setMood,
  updateEntry,
} from "@/lib/api/entries-repo";
import {
  appendMessages,
  createConversation,
  deleteConversation,
  getConversation,
  getLastPersona,
  listConversations,
  listMessages,
  setLastPersona,
} from "@/lib/api/chat-repo";
import { hybridSearchEntries } from "@/lib/api/hybrid-search";
import { todayInWarsaw } from "@/lib/api/dates";
import {
  buildSystemPrompt,
  getChatProvider,
  getPersona,
  PERSONA_ORDER,
  PERSONAS,
} from "@/lib/agent";

// Wzór: każdy tool ma { name, description, inputSchema (ZodRawShape), execute(userId, args) }
// inputSchema jako ZodRawShape (mapa pól) zgodnie z McpServer.tool() z @mcp/sdk.

export interface McpToolDef {
  name: string;
  description: string;
  inputSchema: ZodRawShape;
  execute: (userId: string, args: Record<string, unknown>) => Promise<unknown>;
}

const optionalIsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
  .optional();

const personaKeySchema = z.enum(PERSONA_ORDER as unknown as [string, ...string[]]);

// ───────────── Entries ─────────────

const createEntryTool: McpToolDef = {
  name: "create_entry",
  description:
    "Tworzy nowy wpis w dzienniku użytkownika. Domyślnie z bieżącym czasem; podaj `created_at` jako YYYY-MM-DD by ustawić wpis na konkretny dzień (12:00 Europe/Warsaw) albo pełny ISO timestamp dla precyzyjnej godziny.",
  inputSchema: {
    text: z.string().min(1).describe("Treść wpisu (plain text)."),
    mood: z
      .string()
      .nullable()
      .optional()
      .describe(
        "CSV nastrojów. Często używane: spokoj, radosc, energia, refleksja, zmeczenie."
      ),
    tags: z
      .array(z.string().min(1).max(40))
      .optional()
      .describe("Lista tagów (nieistniejące są tworzone automatycznie)."),
    created_at: z.string().optional().describe("YYYY-MM-DD lub ISO timestamp."),
  },
  execute: async (userId, args) => {
    const a = args as {
      text: string;
      mood?: string | null;
      tags?: string[];
      created_at?: string;
    };
    let createdAt: string | undefined;
    if (a.created_at) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(a.created_at)) {
        const month = parseInt(a.created_at.slice(5, 7), 10);
        const offset = month >= 4 && month <= 10 ? "+02:00" : "+01:00";
        createdAt = `${a.created_at}T12:00:00${offset}`;
      } else {
        createdAt = new Date(a.created_at).toISOString();
      }
    }
    return await createEntry(userId, {
      text: a.text,
      mood: a.mood ?? null,
      tags: a.tags ?? [],
      createdAt,
    });
  },
};

const listEntriesTool: McpToolDef = {
  name: "list_entries",
  description:
    "Listuje wpisy użytkownika. Bez parametrów zwraca wpisy z dzisiaj (Europe/Warsaw). Użyj `day` dla konkretnego dnia, `from`/`to` dla zakresu, `tag`/`mood` dla filtrów.",
  inputSchema: {
    day: optionalIsoDate.describe("YYYY-MM-DD. Domyślnie dziś. Nadpisuje from/to."),
    from: optionalIsoDate,
    to: optionalIsoDate,
    tag: z.string().optional(),
    mood: z.string().optional().describe("Substring matching."),
    limit: z.number().int().min(1).max(200).optional().describe("Default 50."),
  },
  execute: async (userId, args) => {
    const a = args as {
      day?: string;
      from?: string;
      to?: string;
      tag?: string;
      mood?: string;
      limit?: number;
    };
    const filters = {
      day: a.day ?? (a.from || a.to ? undefined : todayInWarsaw()),
      from: a.from,
      to: a.to,
      tag: a.tag,
      mood: a.mood,
      limit: a.limit ?? 50,
    };
    return await listEntries(userId, filters);
  },
};

const getEntryTool: McpToolDef = {
  name: "get_entry",
  description: "Pobiera pełny wpis (treść + tagi + nastrój) po UUID.",
  inputSchema: { entry_id: z.string().uuid() },
  execute: async (userId, args) =>
    await getEntry(userId, (args as { entry_id: string }).entry_id),
};

const updateEntryTool: McpToolDef = {
  name: "update_entry",
  description:
    "Aktualizuje wpis (częściowy update). Możesz zmienić treść, nastrój lub czas utworzenia.",
  inputSchema: {
    entry_id: z.string().uuid(),
    text: z.string().optional(),
    mood: z.string().nullable().optional(),
    created_at: z.string().optional(),
  },
  execute: async (userId, args) => {
    const a = args as {
      entry_id: string;
      text?: string;
      mood?: string | null;
      created_at?: string;
    };
    return await updateEntry(userId, a.entry_id, {
      text: a.text,
      mood: a.mood,
      createdAt: a.created_at,
    });
  },
};

const deleteEntryTool: McpToolDef = {
  name: "delete_entry",
  description: "Usuwa wpis na stałe. Najpierw odpina tagi.",
  inputSchema: { entry_id: z.string().uuid() },
  execute: async (userId, args) => {
    await deleteEntry(userId, (args as { entry_id: string }).entry_id);
    return { deleted: true };
  },
};

const addTagToEntryTool: McpToolDef = {
  name: "add_tag_to_entry",
  description: "Dodaje tag do wpisu. Tag jest tworzony automatycznie jeśli nie istnieje.",
  inputSchema: {
    entry_id: z.string().uuid(),
    tag_name: z.string().min(1).max(40),
  },
  execute: async (userId, args) => {
    const a = args as { entry_id: string; tag_name: string };
    return await attachTag(userId, a.entry_id, a.tag_name);
  },
};

const removeTagFromEntryTool: McpToolDef = {
  name: "remove_tag_from_entry",
  description: "Odpina tag od wpisu (sam tag zostaje w bazie).",
  inputSchema: {
    entry_id: z.string().uuid(),
    tag_name: z.string().min(1),
  },
  execute: async (userId, args) => {
    const a = args as { entry_id: string; tag_name: string };
    return await detachTag(userId, a.entry_id, a.tag_name);
  },
};

const setEntryMoodTool: McpToolDef = {
  name: "set_entry_mood",
  description:
    "Ustawia (lub czyści) nastrój wpisu. `mood: null` aby wyczyścić. CSV nastrojów: spokoj, radosc, energia, refleksja, zmeczenie.",
  inputSchema: {
    entry_id: z.string().uuid(),
    mood: z.string().nullable(),
  },
  execute: async (userId, args) => {
    const a = args as { entry_id: string; mood: string | null };
    return await setMood(userId, a.entry_id, a.mood);
  },
};

// ───────────── Tagi ─────────────

const listMyTagsTool: McpToolDef = {
  name: "list_my_tags",
  description: "Zwraca alfabetyczną listę wszystkich tagów zdefiniowanych przez użytkownika.",
  inputSchema: {},
  execute: async (userId) => ({ tags: await listUserTags(userId) }),
};

// ───────────── Asystenci ─────────────

const listAssistantsTool: McpToolDef = {
  name: "list_assistants",
  description:
    "Lista dostępnych person asystenta AI — każda ma własny styl i system prompt. Wartość `key` używasz w `chat_with_assistant` i `set_current_assistant`.",
  inputSchema: {},
  execute: async () => ({
    assistants: PERSONA_ORDER.map((k) => {
      const p = PERSONAS[k];
      return {
        key: p.key,
        name: p.name,
        description: p.description,
        default_model: p.defaultModel,
        deep_model: p.deepModel,
      };
    }),
  }),
};

const getCurrentAssistantTool: McpToolDef = {
  name: "get_current_assistant",
  description: "Zwraca bieżącego (ostatnio używanego) asystenta dla konta. Fallback: advisor.",
  inputSchema: {},
  execute: async (userId) => {
    const last = await getLastPersona(userId);
    const key = last && PERSONAS[last as keyof typeof PERSONAS] ? last : PERSONA_ORDER[0];
    const p = getPersona(key);
    return {
      current: {
        key: p.key,
        name: p.name,
        description: p.description,
        default_model: p.defaultModel,
        deep_model: p.deepModel,
      },
    };
  },
};

const setCurrentAssistantTool: McpToolDef = {
  name: "set_current_assistant",
  description:
    "Zmienia domyślnego asystenta dla kolejnych rozmów (np. z 'advisor' na 'philosopher').",
  inputSchema: { persona_key: personaKeySchema },
  execute: async (userId, args) => {
    const a = args as { persona_key: string };
    if (!PERSONAS[a.persona_key as keyof typeof PERSONAS]) {
      throw new Error(`unknown_persona_key: ${a.persona_key}`);
    }
    await setLastPersona(userId, a.persona_key);
    const p = getPersona(a.persona_key);
    return {
      current: {
        key: p.key,
        name: p.name,
        description: p.description,
        default_model: p.defaultModel,
        deep_model: p.deepModel,
      },
    };
  },
};

// ───────────── Chat ─────────────

const chatWithAssistantTool: McpToolDef = {
  name: "chat_with_assistant",
  description:
    "Wysyła wiadomość do asystenta AI dziennika. Bez `conversation_id` rozpoczyna nową rozmowę z `persona_key` (lub ostatnio używanym asystentem). Z `conversation_id` kontynuuje istniejącą rozmowę. Asystent ma kontekst wpisów z `day` (domyślnie dziś).",
  inputSchema: {
    text: z.string().min(1),
    conversation_id: z.string().uuid().optional(),
    persona_key: personaKeySchema.optional(),
    day: optionalIsoDate.describe("YYYY-MM-DD — dzień, którego kontekst dostaje asystent."),
    deep_mode: z.boolean().optional().describe("Użyj mocniejszego modelu (deep_model persony)."),
  },
  execute: async (userId, args) => {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("openai_not_configured");
    }
    const a = args as {
      text: string;
      conversation_id?: string;
      persona_key?: string;
      day?: string;
      deep_mode?: boolean;
    };
    const day = a.day ?? todayInWarsaw();

    let conversation;
    let history: { role: "user" | "assistant"; content: string }[] = [];

    if (a.conversation_id) {
      conversation = await getConversation(userId, a.conversation_id);
      const msgs = await listMessages(conversation.id);
      history = msgs.map((m) => ({ role: m.role, content: m.content }));
    } else {
      const fallback = (await getLastPersona(userId)) ?? PERSONA_ORDER[0];
      const personaKey =
        a.persona_key && PERSONAS[a.persona_key as keyof typeof PERSONAS]
          ? a.persona_key
          : fallback;
      conversation = await createConversation(userId, personaKey);
    }

    const persona = getPersona(conversation.persona_key);
    const retrieved = await hybridSearchEntries(userId, a.text, { day });
    const systemPrompt = buildSystemPrompt({ persona, day, retrieved });

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
      { id: "new", role: "user", parts: [{ type: "text", text: a.text }] },
    ];

    const model = a.deep_mode ? persona.deepModel : persona.defaultModel;

    const result = await getChatProvider().generateChat({
      systemPrompt,
      messages: uiMessages,
      model,
      temperature: persona.temperature,
    });

    const [, assistantRow] = await appendMessages(conversation.id, [
      { role: "user", content: a.text },
      { role: "assistant", content: result.content },
    ]);
    await setLastPersona(userId, conversation.persona_key);

    return {
      conversation_id: conversation.id,
      persona_key: conversation.persona_key,
      message: {
        id: assistantRow.id,
        role: assistantRow.role,
        content: assistantRow.content,
        created_at: assistantRow.created_at,
      },
      model_used: result.model,
    };
  },
};

// ───────────── Conversations ─────────────

const listConversationsTool: McpToolDef = {
  name: "list_conversations",
  description: "Lista rozmów użytkownika z asystentem AI (najnowsze najpierw).",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Default 50."),
  },
  execute: async (userId, args) =>
    ({ conversations: await listConversations(userId, (args as { limit?: number }).limit ?? 50) }),
};

const getConversationTool: McpToolDef = {
  name: "get_conversation",
  description: "Pobiera pełną rozmowę z wszystkimi wiadomościami.",
  inputSchema: { conversation_id: z.string().uuid() },
  execute: async (userId, args) => {
    const conv = await getConversation(userId, (args as { conversation_id: string }).conversation_id);
    const messages = await listMessages(conv.id);
    return { conversation: conv, messages };
  },
};

const deleteConversationTool: McpToolDef = {
  name: "delete_conversation",
  description: "Usuwa rozmowę i wszystkie jej wiadomości.",
  inputSchema: { conversation_id: z.string().uuid() },
  execute: async (userId, args) => {
    await deleteConversation(userId, (args as { conversation_id: string }).conversation_id);
    return { deleted: true };
  },
};

// ───────────── Registry ─────────────

export const mcpTools: McpToolDef[] = [
  createEntryTool,
  listEntriesTool,
  getEntryTool,
  updateEntryTool,
  deleteEntryTool,
  addTagToEntryTool,
  removeTagFromEntryTool,
  setEntryMoodTool,
  listMyTagsTool,
  listAssistantsTool,
  getCurrentAssistantTool,
  setCurrentAssistantTool,
  chatWithAssistantTool,
  listConversationsTool,
  getConversationTool,
  deleteConversationTool,
];
