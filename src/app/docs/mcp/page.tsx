// Dokumentacja MCP server. Publiczna.

import { headers } from "next/headers";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

import { DocsLayout, type NavSection } from "../_components/DocsLayout";
import { CodeBlock } from "../_components/CodeBlock";
import { InlineKeyPanel } from "../_components/InlineKeyPanel";

const NAV: NavSection[] = [
  { id: "intro", label: "Wprowadzenie" },
  {
    id: "connect",
    label: "Jak podłączyć",
    items: [
      { id: "connect-claude-web", label: "Claude.ai (web)" },
      { id: "connect-cursor", label: "Cursor" },
      { id: "connect-claude-desktop", label: "Claude Desktop" },
      { id: "connect-chatgpt", label: "ChatGPT Dev Mode" },
      { id: "connect-claude-api", label: "Claude API" },
    ],
  },
  { id: "auth", label: "Autoryzacja" },
  {
    id: "tools",
    label: "Dostępne tools",
    items: [
      { id: "tools-entries", label: "Wpisy" },
      { id: "tools-tags", label: "Tagi i nastrój" },
      { id: "tools-assistants", label: "Asystenci" },
      { id: "tools-chat", label: "Chat" },
      { id: "tools-conversations", label: "Rozmowy" },
    ],
  },
  { id: "oauth-flow", label: "OAuth flow" },
];

export default async function McpDocsPage() {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;
  const mcpUrl = `${baseUrl}/api/mcp`;

  return (
    <DocsLayout sections={NAV} isLoggedIn={isLoggedIn} activeTab="mcp">
      <h1>MCP server</h1>
      <p>
        Twój dziennik wystawia serwer{" "}
        <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener">
          Model Context Protocol
        </a>{" "}
        — natywnie podłączasz go do Claude.ai, Cursora, Claude Desktopa i ChatGPT Developer
        Mode jednym URL-em.
      </p>

      <div className="my-6 rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
        <p className="font-medium mb-1">Endpoint MCP:</p>
        <code className="font-mono text-sm break-all">{mcpUrl}</code>
        <p className="text-xs text-muted mt-2">
          Transport: <strong>Streamable HTTP</strong> (MCP 2025-03-26 spec).
        </p>
      </div>

      <InlineKeyPanel />

      <h2 id="intro">Wprowadzenie</h2>
      <p>
        MCP to standard otwarty przez Anthropic w 2024, który stał się uniwersalnym sposobem
        łączenia agentów AI z narzędziami. Po podłączeniu serwera, agent widzi 16 tools z
        natywnym schematem (parametry, typy, opisy) i może je wywoływać tak jak wbudowane
        funkcje. Bez potrzeby kopiowania OpenAPI ani pisania custom logic.
      </p>
      <ul>
        <li><strong>16 tools</strong> — pełne pokrycie operacji REST API + chat z asystentem.</li>
        <li><strong>OAuth 2.1 + PKCE</strong> — bezpieczne, klikalne dodanie connectora.</li>
        <li><strong>Bearer fallback</strong> — możesz też wkleić API key (sk_live_…) bez OAuth.</li>
        <li><strong>Server-side context</strong> — wpisy i rozmowy ładowane bezpośrednio z bazy, agent ma świeży kontekst.</li>
      </ul>

      <h2 id="connect">Jak podłączyć</h2>

      <h3 id="connect-claude-web">Claude.ai (web — Settings → Connectors)</h3>
      <p>Najlepszy UX — pełny OAuth z consent screenem.</p>
      <ol className="list-decimal pl-5 space-y-1 text-sm my-3">
        <li>Otwórz <strong>Settings → Connectors</strong> w Claude.ai.</li>
        <li>Kliknij <strong>Add custom connector</strong>.</li>
        <li>Wklej URL: <code className="font-mono break-all">{mcpUrl}</code></li>
        <li>Kliknij <strong>Connect</strong> — Claude.ai otworzy nowe okno z naszym ekranem zgody.</li>
        <li>Zaloguj się w Dzienniku (Supabase Auth), kliknij <strong>Autoryzuj</strong>.</li>
        <li>Wrócisz do Claude.ai z aktywnym connectorem. Tools będą dostępne w każdej rozmowie.</li>
      </ol>

      <h3 id="connect-cursor">Cursor</h3>
      <p>
        Dodaj do <code>.cursor/mcp.json</code> w projekcie (lub <code>~/.cursor/mcp.json</code>{" "}
        globalnie):
      </p>
      <CodeBlock
        label=".cursor/mcp.json"
        code={`{
  "mcpServers": {
    "dziennik": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer sk_live_TWOJ_KLUCZ"
      }
    }
  }
}`}
      />

      <h3 id="connect-claude-desktop">Claude Desktop</h3>
      <p>
        Edytuj <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>{" "}
        (macOS) lub <code>%APPDATA%\\Claude\\claude_desktop_config.json</code> (Windows):
      </p>
      <CodeBlock
        label="claude_desktop_config.json"
        code={`{
  "mcpServers": {
    "dziennik": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer sk_live_TWOJ_KLUCZ"
      }
    }
  }
}`}
      />
      <p className="text-xs text-muted">
        Po edycji uruchom Claude Desktop ponownie. Connector pojawi się w spinach 🔌.
      </p>

      <h3 id="connect-chatgpt">ChatGPT Developer Mode (Pro/Business)</h3>
      <ol className="list-decimal pl-5 space-y-1 text-sm my-3">
        <li>Włącz <strong>Developer mode</strong> w Settings → Apps.</li>
        <li>Kliknij <strong>Add server</strong> / <strong>Add connector</strong>.</li>
        <li>Wklej URL: <code className="font-mono break-all">{mcpUrl}</code></li>
        <li>W polu auth wklej <code>Bearer sk_live_TWOJ_KLUCZ</code>.</li>
        <li>Save → tools dostępne w rozmowach.</li>
      </ol>

      <h3 id="connect-claude-api">Claude API (programowo)</h3>
      <p>
        Jeśli wołasz Claude przez API, dodaj MCP w definicji wiadomości:
      </p>
      <CodeBlock
        label="Python (anthropic SDK)"
        code={`import anthropic

client = anthropic.Anthropic()
response = client.beta.messages.create(
    model="claude-opus-4-5",
    max_tokens=1024,
    mcp_servers=[{
        "type": "url",
        "url": "${mcpUrl}",
        "name": "dziennik",
        "authorization_token": "sk_live_TWOJ_KLUCZ"
    }],
    messages=[{"role": "user", "content": "Pokaż moje dzisiejsze wpisy"}]
)`}
      />

      <h2 id="auth">Autoryzacja</h2>
      <p>Serwer akceptuje dwa schematy:</p>
      <ul>
        <li>
          <strong>OAuth 2.1 + Dynamic Client Registration</strong> — używane przez Claude.ai web
          UI i ChatGPT. Klient rejestruje się przez{" "}
          <code>/oauth/register</code>, user przechodzi consent flow, dostajesz JWT (1h) +
          refresh token (30d).
        </li>
        <li>
          <strong>Bearer API key</strong> (<code>sk_live_…</code>) — prostsze, dla Cursor /
          Claude Desktop / skryptów. Wygeneruj klucz wyżej lub w{" "}
          <a href="/ustawienia/api">/ustawienia/api</a>.
        </li>
      </ul>

      <h2 id="tools">Dostępne tools</h2>
      <p>Łącznie <strong>16 tools</strong>. Wszystkie używają snake_case nazw (konwencja MCP).</p>

      <h3 id="tools-entries">Wpisy</h3>
      <ul>
        <li><code>create_entry</code> — utwórz wpis. Params: <code>text, mood?, tags?[], created_at?</code></li>
        <li><code>list_entries</code> — lista wpisów. Params: <code>day?, from?, to?, tag?, mood?, limit?</code></li>
        <li><code>get_entry</code> — szczegóły wpisu. Params: <code>entry_id</code></li>
        <li><code>update_entry</code> — zaktualizuj. Params: <code>entry_id, text?, mood?, created_at?</code></li>
        <li><code>delete_entry</code> — usuń. Params: <code>entry_id</code></li>
      </ul>

      <h3 id="tools-tags">Tagi i nastrój</h3>
      <ul>
        <li><code>add_tag_to_entry</code> — dodaj tag (auto-create). Params: <code>entry_id, tag_name</code></li>
        <li><code>remove_tag_from_entry</code> — odepnij tag. Params: <code>entry_id, tag_name</code></li>
        <li><code>set_entry_mood</code> — ustaw/wyczyść. Params: <code>entry_id, mood (string|null)</code></li>
        <li><code>list_my_tags</code> — lista wszystkich tagów usera.</li>
      </ul>

      <h3 id="tools-assistants">Asystenci</h3>
      <ul>
        <li><code>list_assistants</code> — 6 person z opisami.</li>
        <li><code>get_current_assistant</code> — bieżący (ostatnio używany).</li>
        <li><code>set_current_assistant</code> — zmień. Params: <code>persona_key</code></li>
      </ul>

      <h3 id="tools-chat">Chat</h3>
      <ul>
        <li>
          <code>chat_with_assistant</code> — wyślij wiadomość do asystenta AI dziennika.
          Stateful, z kontekstem dnia. Params:{" "}
          <code>text, conversation_id?, persona_key?, day?, deep_mode?</code>
        </li>
      </ul>

      <h3 id="tools-conversations">Rozmowy</h3>
      <ul>
        <li><code>list_conversations</code> — lista rozmów. Params: <code>limit?</code></li>
        <li><code>get_conversation</code> — rozmowa z wszystkimi wiadomościami. Params: <code>conversation_id</code></li>
        <li><code>delete_conversation</code> — usuń (cascade). Params: <code>conversation_id</code></li>
      </ul>

      <h2 id="oauth-flow">OAuth flow (dla developerów)</h2>
      <p>Pełny przepływ zgodny z OAuth 2.1 + MCP authorization spec:</p>
      <ol className="list-decimal pl-5 space-y-1 text-sm">
        <li>Klient próbuje wywołać <code>{mcpUrl}</code> bez tokenu → <strong>401</strong> z nagłówkiem <code>WWW-Authenticate</code>.</li>
        <li>Klient fetchuje <code>/.well-known/oauth-protected-resource</code> → dostaje listę authorization serverów.</li>
        <li>Klient fetchuje <code>/.well-known/oauth-authorization-server</code> → dostaje URL-e endpoint&apos;ów.</li>
        <li>Klient POST-uje <code>/oauth/register</code> z <code>client_name + redirect_uris</code> → dostaje <code>client_id + client_secret</code> (Dynamic Client Registration, RFC7591).</li>
        <li>Klient otwiera <code>/oauth/authorize?...</code> w przeglądarce z PKCE challenge → user loguje się w Supabase, klika <strong>Autoryzuj</strong>.</li>
        <li>Redirect na <code>redirect_uri?code=…&amp;state=…</code>.</li>
        <li>Klient POST-uje <code>/oauth/token</code> z <code>code + code_verifier</code> → dostaje <strong>JWT access_token (1h)</strong> + <strong>refresh_token (30d)</strong>.</li>
        <li>Klient wywołuje <code>{mcpUrl}</code> z <code>Authorization: Bearer &lt;jwt&gt;</code> — tools są dostępne. Refresh rotuje się automatycznie.</li>
      </ol>
      <p className="text-sm text-muted mt-3">
        Dyskaverka discovery (RFC9728 + RFC8414), PKCE S256 obowiązkowe, refresh token rotation
        włączona. Wszystkie kody one-time use, TTL 60s.
      </p>
    </DocsLayout>
  );
}
