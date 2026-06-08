// /llms.txt — markdown specification dla LLM-ów (konwencja llmstxt.org).
// ChatGPT i Claude czytają to natywnie, lepiej niż HTML. Krótsze niż OpenAPI,
// idealne na pierwszy kontakt.

import { headers } from "next/headers";

import { PERSONA_ORDER, PERSONAS } from "@/lib/agent";

export const runtime = "nodejs";

export async function GET() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  const personasMd = PERSONA_ORDER.map((k) => {
    const p = PERSONAS[k];
    return `- \`${p.key}\` — **${p.name}**: ${p.description}`;
  }).join("\n");

  const body = `# Dziennik API

REST API do osobistego dziennika. Wpisy, tagi, nastrój i rozmowy z asystentem AI.
Wszystkie odpowiedzi w JSON. Pola w snake_case. Daty w ISO 8601. Strefa dni: Europe/Warsaw.

- Base URL: \`${baseUrl}/api/v1\`
- OpenAPI 3.1: ${baseUrl}/openapi.json
- HTML docs: ${baseUrl}/docs

## Authentication

Każde żądanie wymaga nagłówka:

\`\`\`
Authorization: Bearer <token>
\`\`\`

Akceptowane są dwa rodzaje tokenów:

1. **API key** — długoterminowy, format \`sk_live_…\`. User generuje w UI: \`${baseUrl}/ustawienia/api\`. Zalecane dla agentów.
2. **Supabase JWT** — access token z Supabase Auth. Wygasa po ~1h.

Brak / zły token → \`401 {"error":"unauthorized"}\`.

## Error format

\`\`\`json
{ "error": "not_found", "detail": "opcjonalne info" }
\`\`\`

Kody: \`400\` (bad_request), \`401\` (unauthorized), \`404\` (not_found), \`500\` (internal_error).

## Endpoints

### Entries (wpisy dziennika)

- \`POST   /entries\` — utwórz wpis. Body: \`{ text, mood?, tags?[], created_at? }\`. Domyślnie czas teraz; \`created_at\` może być YYYY-MM-DD (12:00 Warsaw).
- \`GET    /entries\` — lista. Query: \`day=YYYY-MM-DD\` (domyślnie dziś), \`from\`, \`to\`, \`tag\`, \`mood\`, \`limit\` (max 200).
- \`GET    /entries/{id}\` — pełny wpis.
- \`PATCH  /entries/{id}\` — częściowy update. Body: \`{ text?, html?, mood?, created_at? }\`.
- \`DELETE /entries/{id}\` — usuń wpis.

### Tags & Mood

- \`GET    /tags\` — wszystkie tagi usera (alfabetycznie).
- \`POST   /entries/{id}/tags\` — dodaj tag. Body: \`{ name }\`. Tworzony jeśli nie istnieje.
- \`DELETE /entries/{id}/tags/{name}\` — odepnij tag (nie kasuje samego tagu).
- \`PATCH  /entries/{id}/mood\` — ustaw/wyczyść. Body: \`{ mood: "spokoj,radosc" | null }\`. CSV. Najczęściej: spokoj, radosc, energia, refleksja, zmeczenie.

### Assistants (persony AI)

${personasMd}

- \`GET /assistants\` — pełna lista person.
- \`GET /assistants/current\` — ostatnio używany asystent (server-side).
- \`PUT /assistants/current\` — zmień. Body: \`{ persona_key }\`.

### Chat (stateful, JSON one-shot)

- \`POST /chat\` — body: \`{ text, conversation_id?, persona_key?, day?, deep_mode? }\`.
  - Bez \`conversation_id\` → nowa rozmowa (persona z body, fallback last_persona).
  - Z \`conversation_id\` → kontynuacja.
  - Asystent dostaje kontekst wpisów z \`day\` (domyślnie dziś).
  - Returns: \`{ conversation_id, persona_key, message: { role, content, created_at }, model_used }\`.

### Conversations

- \`GET    /conversations\` — lista rozmów (najnowsze najpierw). Query: \`limit\`.
- \`GET    /conversations/{id}\` — rozmowa + wszystkie wiadomości.
- \`DELETE /conversations/{id}\` — usuń (cascade wiadomości).

## Example: utwórz wpis i porozmawiaj o nim

\`\`\`bash
TOKEN="sk_live_..."
BASE="${baseUrl}/api/v1"

# 1. Utwórz wpis
curl -X POST "$BASE/entries" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Spokojny poranek, kawa na balkonie.","mood":"spokoj","tags":["rano"]}'

# 2. Spytaj asystenta (kontekst dnia ładuje się automatycznie z bazy)
curl -X POST "$BASE/chat" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"text":"Co dziś warto przemyśleć?"}'
\`\`\`

## Rate limits

Brak twardych limitów na MVP. Fair-use. Limity przyjdą jako 429 z \`Retry-After\`.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
