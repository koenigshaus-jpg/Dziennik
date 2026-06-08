// OpenAPI 3.1 spec — jedno źródło prawdy dla maszynowo-czytelnej dokumentacji.
// Wystawiane na /openapi.json (route handler). ChatGPT, Claude, generatory
// SDK i MCP konsumują to natywnie.

import { PERSONA_ORDER, PERSONAS } from "@/lib/agent";

export function buildOpenApiSpec(baseUrl: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Dziennik API",
      version: "1.0.0",
      description:
        "REST API do osobistego dziennika — wpisy, tagi, nastrój i rozmowy z asystentem AI. Auth: Bearer token (API key sk_live_… lub Supabase JWT). Polski UI/dane; pola w snake_case.",
      contact: { name: "Dziennik", url: `${baseUrl}/docs` },
    },
    servers: [{ url: `${baseUrl}/api/v1`, description: "Production" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat:
            "API key (sk_live_…) lub Supabase JWT access_token",
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string", example: "not_found" },
            detail: {},
          },
        },
        Entry: {
          type: "object",
          required: ["id", "created_at", "updated_at", "content_text", "content_html", "tags"],
          properties: {
            id: { type: "string", format: "uuid" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
            content_text: { type: "string" },
            content_html: { type: "string" },
            mood: { type: ["string", "null"], example: "spokoj,radosc" },
            tags: { type: "array", items: { type: "string" } },
          },
        },
        EntryCreate: {
          type: "object",
          required: ["text"],
          properties: {
            text: {
              type: "string",
              description: "Treść wpisu (plain text). HTML generowany automatycznie z akapitów.",
            },
            html: { type: "string", description: "Opcjonalny własny HTML zamiast auto-generowanego." },
            mood: {
              type: ["string", "null"],
              description:
                "CSV nastrojów. Najczęściej używane: spokoj, radosc, energia, refleksja, zmeczenie.",
              example: "spokoj,radosc",
            },
            tags: { type: "array", items: { type: "string", maxLength: 40 } },
            created_at: {
              type: "string",
              description: "ISO timestamp lub YYYY-MM-DD (przelicza się na 12:00 Europe/Warsaw).",
            },
          },
        },
        EntryUpdate: {
          type: "object",
          properties: {
            text: { type: "string" },
            html: { type: "string" },
            mood: { type: ["string", "null"] },
            created_at: { type: "string" },
          },
        },
        Assistant: {
          type: "object",
          required: ["key", "name", "description", "default_model", "deep_model"],
          properties: {
            key: { type: "string", enum: PERSONA_ORDER },
            name: { type: "string" },
            description: { type: "string" },
            default_model: { type: "string" },
            deep_model: { type: "string" },
          },
        },
        ChatRequest: {
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string", description: "Wiadomość od użytkownika." },
            conversation_id: {
              type: "string",
              format: "uuid",
              description: "Jeśli podany — kontynuacja rozmowy. Brak = nowa.",
            },
            persona_key: {
              type: "string",
              enum: PERSONA_ORDER,
              description: "Tylko przy nowej rozmowie. Fallback: ostatnio używany asystent.",
            },
            day: {
              type: "string",
              pattern: "^\\d{4}-\\d{2}-\\d{2}$",
              description: "Dzień kontekstu (asystent dostaje wpisy z tego dnia). Domyślnie dziś (Europe/Warsaw).",
            },
            deep_mode: { type: "boolean", description: "Użyj mocniejszego modelu (deep_model persony)." },
          },
        },
        ChatResponse: {
          type: "object",
          required: ["conversation_id", "persona_key", "message", "model_used"],
          properties: {
            conversation_id: { type: "string", format: "uuid" },
            persona_key: { type: "string", enum: PERSONA_ORDER },
            message: {
              type: "object",
              properties: {
                id: { type: "string" },
                role: { type: "string", enum: ["assistant"] },
                content: { type: "string" },
                created_at: { type: "string", format: "date-time" },
              },
            },
            model_used: { type: "string" },
          },
        },
        Conversation: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            persona_key: { type: "string", enum: PERSONA_ORDER },
            title: { type: ["string", "null"] },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        Message: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            conversation_id: { type: "string", format: "uuid" },
            role: { type: "string", enum: ["user", "assistant"] },
            content: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: "Brak / niepoprawny / unieważniony token.",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        NotFound: {
          description: "Zasób nie istnieje lub nie należy do tego usera.",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
        BadRequest: {
          description: "Niepoprawne dane wejściowe.",
          content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/entries": {
        post: {
          summary: "Utwórz wpis",
          description:
            "Domyślnie z bieżącym czasem. `created_at` może być YYYY-MM-DD (12:00 Warsaw) lub pełny ISO timestamp.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/EntryCreate" } } },
          },
          responses: {
            "201": {
              description: "Utworzono. Zwraca pełny wpis z tagami.",
              content: { "application/json": { schema: { $ref: "#/components/schemas/Entry" } } },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
        get: {
          summary: "Lista wpisów",
          description:
            "Bez parametrów = wpisy z dzisiaj (Europe/Warsaw). Filtry łączą się logicznie AND.",
          parameters: [
            { name: "day", in: "query", schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" }, description: "Konkretny dzień. Nadpisuje from/to." },
            { name: "from", in: "query", schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } },
            { name: "to", in: "query", schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" } },
            { name: "tag", in: "query", schema: { type: "string" } },
            { name: "mood", in: "query", schema: { type: "string" }, description: "Substring matching." },
            { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 200 } },
          ],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      entries: { type: "array", items: { $ref: "#/components/schemas/Entry" } },
                      filters: { type: "object" },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/entries/{id}": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        get: {
          summary: "Pobierz wpis",
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Entry" } } } },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
        patch: {
          summary: "Aktualizuj wpis (częściowy)",
          requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/EntryUpdate" } } } },
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Entry" } } } },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
        delete: {
          summary: "Usuń wpis",
          responses: {
            "200": {
              description: "OK",
              content: { "application/json": { schema: { type: "object", properties: { deleted: { type: "boolean" } } } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/entries/{id}/tags": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        post: {
          summary: "Dodaj tag do wpisu",
          description: "Tag jest tworzony automatycznie jeśli nie istnieje.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string", maxLength: 40 } } } } },
          },
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Entry" } } } },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/entries/{id}/tags/{name}": {
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "name", in: "path", required: true, schema: { type: "string" }, description: "URL-encoded nazwa tagu." },
        ],
        delete: {
          summary: "Odepnij tag (sam tag zostaje w bazie)",
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Entry" } } } },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/entries/{id}/mood": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        patch: {
          summary: "Ustaw / wyczyść nastrój",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", required: ["mood"], properties: { mood: { type: ["string", "null"] } } } } },
          },
          responses: {
            "200": { description: "OK", content: { "application/json": { schema: { $ref: "#/components/schemas/Entry" } } } },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
      "/tags": {
        get: {
          summary: "Lista wszystkich tagów użytkownika",
          responses: {
            "200": {
              description: "OK",
              content: { "application/json": { schema: { type: "object", properties: { tags: { type: "array", items: { type: "string" } } } } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/assistants": {
        get: {
          summary: "Lista dostępnych asystentów (person)",
          description: Object.values(PERSONAS)
            .map((p) => `- \`${p.key}\` — ${p.name}: ${p.description}`)
            .join("\n"),
          responses: {
            "200": {
              description: "OK",
              content: { "application/json": { schema: { type: "object", properties: { assistants: { type: "array", items: { $ref: "#/components/schemas/Assistant" } } } } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/assistants/current": {
        get: {
          summary: "Bieżący (ostatnio używany) asystent",
          responses: {
            "200": {
              description: "OK",
              content: { "application/json": { schema: { type: "object", properties: { current: { $ref: "#/components/schemas/Assistant" } } } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
        put: {
          summary: "Zmień domyślnego asystenta",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { type: "object", required: ["persona_key"], properties: { persona_key: { type: "string", enum: PERSONA_ORDER } } } } },
          },
          responses: {
            "200": {
              description: "OK",
              content: { "application/json": { schema: { type: "object", properties: { current: { $ref: "#/components/schemas/Assistant" } } } } },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/chat": {
        post: {
          summary: "Wyślij wiadomość do asystenta",
          description:
            "Stateful — serwer przechowuje rozmowy. Bez `conversation_id` tworzona jest nowa rozmowa z `persona_key` (lub last_persona). Asystent dostaje kontekst wpisów z `day`.",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ChatRequest" } } },
          },
          responses: {
            "200": {
              description: "OK — odpowiedź asystenta",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ChatResponse" } } },
            },
            "400": { $ref: "#/components/responses/BadRequest" },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/conversations": {
        get: {
          summary: "Lista rozmów",
          parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 200 } }],
          responses: {
            "200": {
              description: "OK",
              content: { "application/json": { schema: { type: "object", properties: { conversations: { type: "array", items: { $ref: "#/components/schemas/Conversation" } } } } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
          },
        },
      },
      "/conversations/{id}": {
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        get: {
          summary: "Pobierz rozmowę z wiadomościami",
          responses: {
            "200": {
              description: "OK",
              content: { "application/json": { schema: { type: "object", properties: { conversation: { $ref: "#/components/schemas/Conversation" }, messages: { type: "array", items: { $ref: "#/components/schemas/Message" } } } } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
        delete: {
          summary: "Usuń rozmowę (cascade wiadomości)",
          responses: {
            "200": {
              description: "OK",
              content: { "application/json": { schema: { type: "object", properties: { deleted: { type: "boolean" } } } } },
            },
            "401": { $ref: "#/components/responses/Unauthorized" },
            "404": { $ref: "#/components/responses/NotFound" },
          },
        },
      },
    },
  } as const;
}
