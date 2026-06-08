// Publiczna dokumentacja API. Dostępna bez logowania (middleware przepuszcza /docs/*).
// Server component — wykrywa stan logowania, żeby pokazać odpowiednie CTA w ApiKeyCallout.

import { headers } from "next/headers";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { PERSONAS, PERSONA_ORDER } from "@/lib/agent";

import { DocsLayout, type NavSection } from "./_components/DocsLayout";
import { CodeBlock } from "./_components/CodeBlock";
import { Endpoint, ParamsTable } from "./_components/Endpoint";
import { ApiKeyCallout } from "./_components/ApiKeyCallout";

const NAV: NavSection[] = [
  { id: "intro", label: "Wprowadzenie" },
  { id: "auth", label: "Autoryzacja" },
  { id: "errors", label: "Błędy" },
  {
    id: "entries",
    label: "Wpisy",
    items: [
      { id: "entries-create", label: "Utwórz wpis" },
      { id: "entries-list", label: "Lista wpisów" },
      { id: "entries-get", label: "Pobierz wpis" },
      { id: "entries-update", label: "Aktualizuj wpis" },
      { id: "entries-delete", label: "Usuń wpis" },
    ],
  },
  {
    id: "tags-mood",
    label: "Tagi i nastrój",
    items: [
      { id: "tags-list", label: "Lista tagów" },
      { id: "tag-attach", label: "Dodaj tag do wpisu" },
      { id: "tag-detach", label: "Usuń tag z wpisu" },
      { id: "mood-set", label: "Ustaw nastrój" },
    ],
  },
  {
    id: "assistants",
    label: "Asystenci",
    items: [
      { id: "assistants-list", label: "Lista asystentów" },
      { id: "assistants-current-get", label: "Bieżący asystent" },
      { id: "assistants-current-set", label: "Zmień asystenta" },
    ],
  },
  {
    id: "chat",
    label: "Chat",
    items: [{ id: "chat-send", label: "Wyślij wiadomość" }],
  },
  {
    id: "conversations",
    label: "Rozmowy",
    items: [
      { id: "conv-list", label: "Lista rozmów" },
      { id: "conv-get", label: "Pobierz rozmowę" },
      { id: "conv-delete", label: "Usuń rozmowę" },
    ],
  },
  { id: "rate-limits", label: "Limity" },
];

export default async function DocsPage() {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  // Base URL = aktualny host (działa zarówno na localhost, preview, jak i produkcji).
  // Czyta nagłówki Vercela (x-forwarded-host) lub fallback do `host`.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  return (
    <DocsLayout sections={NAV} isLoggedIn={isLoggedIn}>
      {/* INTRO */}
      <h1>Dziennik API</h1>
      <p>
        REST API do osobistego dziennika — wpisy, tagi, nastrój i rozmowy z asystentem AI.
        Endpointy zwracają JSON, używają standardowych kodów HTTP i są zaprojektowane pod
        agentów (Claude, ChatGPT, własne skrypty).
      </p>

      {/* Maszynowe specyfikacje — pierwsza rzecz, którą widzi agent */}
      <div className="my-6 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
        <p className="font-medium mb-2">Dla agentów (ChatGPT, Claude, MCP):</p>
        <ul className="space-y-1 text-sm">
          <li>
            <strong>OpenAPI 3.1:</strong>{" "}
            <a href={`${baseUrl}/openapi.json`} className="font-mono underline">
              {baseUrl}/openapi.json
            </a>
          </li>
          <li>
            <strong>Markdown spec (llms.txt):</strong>{" "}
            <a href={`${baseUrl}/llms.txt`} className="font-mono underline">
              {baseUrl}/llms.txt
            </a>
          </li>
        </ul>
        <p className="text-xs text-muted mt-2">
          Wklej powyższy URL agentowi (np. „przeczytaj <code>{baseUrl}/openapi.json</code>") — od razu zrozumie strukturę API i wygeneruje requesty.
        </p>
      </div>

      <h2 id="intro">Wprowadzenie</h2>
      <p>
        Każde wywołanie musi mieć ważne uwierzytelnienie i jest powiązane z konkretnym
        użytkownikiem — odpowiedzi nigdy nie wyciekną cudzych wpisów.
      </p>
      <ul>
        <li><strong>Base URL:</strong> <code>{baseUrl}/api/v1</code></li>
        <li><strong>Format:</strong> JSON (request body i response)</li>
        <li><strong>Konwencja:</strong> nazwy pól w <code>snake_case</code>, daty w ISO 8601</li>
        <li><strong>Strefa dni:</strong> Europe/Warsaw — domyślny <code>day</code> = dzisiaj lokalnie</li>
      </ul>

      {/* AUTH */}
      <h2 id="auth">Autoryzacja</h2>
      <p>
        Wszystkie endpointy wymagają nagłówka <code>Authorization: Bearer &lt;token&gt;</code>.
        Akceptowane są dwa rodzaje tokenów:
      </p>

      <h3>1. Personal API key (zalecane)</h3>
      <p>
        Długoterminowy token w formacie <code>sk_live_…</code>. Generujesz go w ustawieniach
        konta. Klucz widzisz tylko raz — po zapisaniu w bezpiecznym miejscu nie zobaczysz go
        ponownie. Możesz w każdej chwili go unieważnić.
      </p>

      <ApiKeyCallout />

      <CodeBlock
        label="cURL"
        code={`curl -H "Authorization: Bearer sk_live_..." \\\n     ${baseUrl}/api/v1/entries`}
      />

      <h3>2. Supabase JWT</h3>
      <p>
        Alternatywa dla zaawansowanych integracji — access token z Supabase Auth (np. uzyskany
        przez <code>supabase.auth.signInWithPassword()</code>). Token wygasa po ~1h, więc nie
        nadaje się do długo żyjących agentów. Format: dowolny token <em>nie</em> zaczynający
        się od <code>sk_live_</code>.
      </p>

      {/* ERRORS */}
      <h2 id="errors">Błędy</h2>
      <p>Format błędu jest jednolity:</p>
      <CodeBlock
        label="Response (4xx/5xx)"
        code={`{
  "error": "not_found",
  "detail": "..."   // opcjonalne, dodatkowe info
}`}
      />
      <ParamsTable
        rows={[
          { name: "400", type: "bad_request", description: "Niepoprawne dane wejściowe (Zod, parsowanie JSON, brakujące pola)." },
          { name: "401", type: "unauthorized", description: "Brak / niepoprawny / unieważniony token." },
          { name: "404", type: "not_found", description: "Wpis / rozmowa / tag nie istnieje lub nie należy do Ciebie." },
          { name: "500", type: "internal_error", description: "Niespodziewany błąd serwera." },
        ]}
      />

      {/* ENTRIES */}
      <h2 id="entries">Wpisy</h2>

      <Endpoint id="entries-create" method="POST" path="/api/v1/entries">
        <p>Tworzy nowy wpis. Domyślnie z bieżącą datą i czasem.</p>
        <ParamsTable
          rows={[
            { name: "text", type: "string", required: true, description: "Treść wpisu (plain text). HTML generowany automatycznie." },
            { name: "html", type: "string?", description: "Własny HTML zamiast auto-generowanego z text." },
            { name: "mood", type: "string?|null", description: <>CSV nastrojów, np. <code>&quot;spokoj,radosc&quot;</code>. W bazie spotykane: <code>spokoj</code>, <code>radosc</code>, <code>energia</code>, <code>refleksja</code>, <code>zmeczenie</code>.</> },
            { name: "tags", type: "string[]?", description: "Lista tagów (nieistniejące są tworzone)." },
            { name: "created_at", type: "string?", description: <>ISO timestamp lub <code>YYYY-MM-DD</code> (przelicza się na 12:00 Europe/Warsaw).</> },
          ]}
        />
        <CodeBlock
          label="cURL"
          code={`curl -X POST ${baseUrl}/api/v1/entries \\\n  -H "Authorization: Bearer sk_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "text": "Spokojny poranek, kawa na balkonie.",\n    "mood": "spokoj",\n    "tags": ["rano", "dom"]\n  }'`}
        />
        <CodeBlock
          label="Response 201"
          code={`{
  "id": "c1d28e56-00cf-47ff-9b05-b5eae40fbdf5",
  "created_at": "2026-06-08T10:00:00+00:00",
  "updated_at": "2026-06-08T10:00:00+00:00",
  "content_text": "Spokojny poranek, kawa na balkonie.",
  "content_html": "<p>Spokojny poranek, kawa na balkonie.</p>",
  "mood": "spokoj",
  "tags": ["rano", "dom"]
}`}
        />
      </Endpoint>

      <Endpoint id="entries-list" method="GET" path="/api/v1/entries">
        <p>Listuje wpisy. Bez parametrów zwraca wpisy z dzisiaj.</p>
        <ParamsTable
          rows={[
            { name: "day", type: "query", description: <>Data <code>YYYY-MM-DD</code>. Domyślnie dziś (Europe/Warsaw).</> },
            { name: "from", type: "query", description: <>Początek zakresu. Nadpisuje <code>day</code>.</> },
            { name: "to", type: "query", description: "Koniec zakresu (włącznie)." },
            { name: "tag", type: "query", description: "Filtruj po tagu." },
            { name: "mood", type: "query", description: "Filtruj po substringu nastroju." },
            { name: "limit", type: "query", description: "Maks. liczba wyników (default 50, max 200)." },
          ]}
        />
        <CodeBlock
          label="cURL"
          code={`curl "${baseUrl}/api/v1/entries?day=2026-06-08" \\\n  -H "Authorization: Bearer sk_live_..."`}
        />
        <CodeBlock
          label="Response 200"
          code={`{
  "entries": [
    {
      "id": "c1d28e56-...",
      "created_at": "2026-06-08T10:00:00+00:00",
      "mood": "spokoj",
      "tags": ["rano"],
      "content_text": "...",
      "content_html": "..."
    }
  ],
  "filters": { "day": "2026-06-08", "limit": 50 }
}`}
        />
      </Endpoint>

      <Endpoint id="entries-get" method="GET" path="/api/v1/entries/{id}">
        <p>Pełny wpis z tagami.</p>
        <CodeBlock label="cURL" code={`curl ${baseUrl}/api/v1/entries/c1d28e56-... \\\n  -H "Authorization: Bearer sk_live_..."`} />
      </Endpoint>

      <Endpoint id="entries-update" method="PATCH" path="/api/v1/entries/{id}">
        <p>Częściowy update. Pole <code>text</code> przepisuje też auto-generowany HTML.</p>
        <ParamsTable
          rows={[
            { name: "text", type: "string?", description: "Nowa treść (plain text)." },
            { name: "html", type: "string?", description: "Nowy HTML. Jeśli oba puste — bez zmian treści." },
            { name: "mood", type: "string?|null", description: "Nowy nastrój lub null żeby wyczyścić." },
            { name: "created_at", type: "string?", description: "Nowy timestamp." },
          ]}
        />
        <CodeBlock label="cURL" code={`curl -X PATCH ${baseUrl}/api/v1/entries/c1d28e56-... \\\n  -H "Authorization: Bearer sk_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"text": "Poprawiona treść"}'`} />
      </Endpoint>

      <Endpoint id="entries-delete" method="DELETE" path="/api/v1/entries/{id}">
        <p>Usuwa wpis (i odpina jego tagi). Tagi same w sobie nie są kasowane.</p>
        <CodeBlock label="cURL" code={`curl -X DELETE ${baseUrl}/api/v1/entries/c1d28e56-... \\\n  -H "Authorization: Bearer sk_live_..."`} />
        <CodeBlock label="Response 200" code={`{"deleted": true}`} />
      </Endpoint>

      {/* TAGS & MOOD */}
      <h2 id="tags-mood">Tagi i nastrój</h2>

      <Endpoint id="tags-list" method="GET" path="/api/v1/tags">
        <p>Wszystkie tagi użytkownika (alfabetycznie).</p>
        <CodeBlock label="Response 200" code={`{"tags": ["dom", "praca", "rano"]}`} />
      </Endpoint>

      <Endpoint id="tag-attach" method="POST" path="/api/v1/entries/{id}/tags">
        <p>Dodaje tag do wpisu. Tag jest tworzony jeśli nie istnieje.</p>
        <ParamsTable rows={[{ name: "name", type: "string", required: true, description: "Nazwa tagu (max 40 znaków)." }]} />
        <CodeBlock label="cURL" code={`curl -X POST ${baseUrl}/api/v1/entries/c1d28e56-.../tags \\\n  -H "Authorization: Bearer sk_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "ważne"}'`} />
      </Endpoint>

      <Endpoint id="tag-detach" method="DELETE" path="/api/v1/entries/{id}/tags/{name}">
        <p>Odpina tag od wpisu (sam tag zostaje w bazie).</p>
        <CodeBlock label="cURL" code={`curl -X DELETE ${baseUrl}/api/v1/entries/c1d28e56-.../tags/wa%C5%BCne \\\n  -H "Authorization: Bearer sk_live_..."`} />
      </Endpoint>

      <Endpoint id="mood-set" method="PATCH" path="/api/v1/entries/{id}/mood">
        <p>Ustawia (lub czyści) nastrój. <code>null</code> = usuń nastrój.</p>
        <CodeBlock label="cURL" code={`curl -X PATCH ${baseUrl}/api/v1/entries/c1d28e56-.../mood \\\n  -H "Authorization: Bearer sk_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"mood": "spokoj,refleksja"}'`} />
      </Endpoint>

      {/* ASSISTANTS */}
      <h2 id="assistants">Asystenci</h2>
      <p>
        Dostępne persony (każda ma własny styl, system prompt i parametry):
      </p>
      <ul>
        {PERSONA_ORDER.map((k) => {
          const p = PERSONAS[k];
          return (
            <li key={k}>
              <code>{p.key}</code> — <strong>{p.name}</strong>: {p.description}
            </li>
          );
        })}
      </ul>

      <Endpoint id="assistants-list" method="GET" path="/api/v1/assistants">
        <p>Lista wszystkich asystentów.</p>
        <CodeBlock label="cURL" code={`curl ${baseUrl}/api/v1/assistants \\\n  -H "Authorization: Bearer sk_live_..."`} />
      </Endpoint>

      <Endpoint id="assistants-current-get" method="GET" path="/api/v1/assistants/current">
        <p>Bieżący (ostatnio używany) asystent dla Twojego konta. Fallback: <code>advisor</code>.</p>
        <CodeBlock label="Response 200" code={`{
  "current": {
    "key": "philosopher",
    "name": "Filozof",
    "description": "...",
    "default_model": "gpt-4o-mini",
    "deep_model": "gpt-4o"
  }
}`} />
      </Endpoint>

      <Endpoint id="assistants-current-set" method="PUT" path="/api/v1/assistants/current">
        <p>Zmienia asystenta wybranego jako domyślny dla kolejnych rozmów.</p>
        <ParamsTable rows={[{ name: "persona_key", type: "string", required: true, description: <>Klucz persony, np. <code>&quot;philosopher&quot;</code>.</> }]} />
        <CodeBlock label="cURL" code={`curl -X PUT ${baseUrl}/api/v1/assistants/current \\\n  -H "Authorization: Bearer sk_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"persona_key": "philosopher"}'`} />
      </Endpoint>

      {/* CHAT */}
      <h2 id="chat">Chat</h2>
      <p>
        Stateful — serwer przechowuje rozmowy. Bez <code>conversation_id</code> tworzona jest
        nowa, z istniejącym kontynuujesz historię. Asystent ma kontekst Twoich wpisów z
        wybranego dnia (domyślnie dzisiaj) plus indeks pozostałych.
      </p>

      <Endpoint id="chat-send" method="POST" path="/api/v1/chat">
        <ParamsTable
          rows={[
            { name: "text", type: "string", required: true, description: "Treść wiadomości od użytkownika." },
            { name: "conversation_id", type: "uuid?", description: "Jeśli podany — kontynuacja rozmowy." },
            { name: "persona_key", type: "string?", description: "Tylko przy tworzeniu nowej rozmowy. Fallback: ostatnio używany asystent." },
            { name: "day", type: "string?", description: <>Dzień kontekstu (<code>YYYY-MM-DD</code>). Domyślnie dziś.</> },
            { name: "deep_mode", type: "boolean?", description: "Użyj mocniejszego modelu (deep_model persony)." },
          ]}
        />
        <CodeBlock label="cURL — nowa rozmowa" code={`curl -X POST ${baseUrl}/api/v1/chat \\\n  -H "Authorization: Bearer sk_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"text": "Co dziś warto przemyśleć?"}'`} />
        <CodeBlock label="cURL — kontynuacja" code={`curl -X POST ${baseUrl}/api/v1/chat \\\n  -H "Authorization: Bearer sk_live_..." \\\n  -H "Content-Type: application/json" \\\n  -d '{"text": "Rozwiń ostatni punkt", "conversation_id": "abc-..."}'`} />
        <CodeBlock label="Response 200" code={`{
  "conversation_id": "abc-...",
  "persona_key": "advisor",
  "message": {
    "id": "msg-...",
    "role": "assistant",
    "content": "Twoja odpowiedź...",
    "created_at": "2026-06-08T10:00:00+00:00"
  },
  "model_used": "gpt-4o-mini"
}`} />
      </Endpoint>

      {/* CONVERSATIONS */}
      <h2 id="conversations">Rozmowy</h2>

      <Endpoint id="conv-list" method="GET" path="/api/v1/conversations">
        <p>Lista Twoich rozmów (najnowsze najpierw).</p>
        <ParamsTable rows={[{ name: "limit", type: "query", description: "Default 50, max 200." }]} />
      </Endpoint>

      <Endpoint id="conv-get" method="GET" path="/api/v1/conversations/{id}">
        <p>Pełna rozmowa z wszystkimi wiadomościami.</p>
        <CodeBlock label="Response 200" code={`{
  "conversation": {
    "id": "abc-...",
    "persona_key": "advisor",
    "title": null,
    "created_at": "...",
    "updated_at": "..."
  },
  "messages": [
    { "role": "user", "content": "...", "created_at": "..." },
    { "role": "assistant", "content": "...", "created_at": "..." }
  ]
}`} />
      </Endpoint>

      <Endpoint id="conv-delete" method="DELETE" path="/api/v1/conversations/{id}">
        <p>Usuwa rozmowę i wszystkie jej wiadomości.</p>
      </Endpoint>

      {/* RATE LIMITS */}
      <h2 id="rate-limits">Limity</h2>
      <p>
        Obecnie API nie ma twardych limitów (MVP) — obowiązuje fair-use. W przyszłości
        wprowadzimy limit per klucz (np. 60 req/min). Limity będą sygnalizowane kodem{" "}
        <code>429</code> i nagłówkiem <code>Retry-After</code>.
      </p>
    </DocsLayout>
  );
}
