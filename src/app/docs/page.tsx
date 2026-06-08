// Landing /docs — dwa kierunki: REST API albo MCP.
// Dla agenta = pierwszy punkt kontaktu; dla developera = wybór ścieżki.

import { headers } from "next/headers";
import Link from "next/link";
import { ArrowRight, BookOpen, Plug } from "lucide-react";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

import { DocsLayout, type NavSection } from "./_components/DocsLayout";

const NAV: NavSection[] = [
  { id: "intro", label: "Wybierz integrację" },
  { id: "links", label: "Spec dla maszyn" },
];

export default async function DocsLanding() {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;

  return (
    <DocsLayout sections={NAV} isLoggedIn={isLoggedIn} activeTab={null}>
      <h1>Dziennik · Dokumentacja</h1>
      <p>
        Twój dziennik wystawia dwa kompatybilne interfejsy. Wybierz ścieżkę zależnie od tego,
        co budujesz — REST API dla skryptów i własnych integracji, MCP dla agentów (Claude.ai,
        Cursor, ChatGPT Developer Mode).
      </p>

      <h2 id="intro" className="!border-t-0 !pt-0">Wybierz integrację</h2>

      <div className="grid gap-4 sm:grid-cols-2 my-6">
        <Link
          href="/docs/api"
          className="group rounded-xl border border-border bg-foreground/[0.02] p-5 hover:bg-foreground/[0.04] transition-colors"
        >
          <BookOpen className="h-6 w-6 mb-3 text-foreground/70" />
          <p className="font-semibold text-base mb-1">REST API</p>
          <p className="text-sm text-muted mb-3">
            Standardowe JSON-owe endpointy <code className="text-xs">/api/v1/*</code>. Auth Bearer
            (sk_live_…). Dla skryptów Python/JS, własnych botów, postman, custom GPT actions.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground/80 group-hover:text-foreground">
            Otwórz dokumentację REST <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <Link
          href="/docs/mcp"
          className="group rounded-xl border border-border bg-foreground/[0.02] p-5 hover:bg-foreground/[0.04] transition-colors"
        >
          <Plug className="h-6 w-6 mb-3 text-foreground/70" />
          <p className="font-semibold text-base mb-1">MCP server</p>
          <p className="text-sm text-muted mb-3">
            Model Context Protocol — natywne podłączenie do Claude.ai (Add Connector), Cursor,
            Claude Desktop, ChatGPT Developer Mode. OAuth 2.1 + 15 tools.
          </p>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground/80 group-hover:text-foreground">
            Otwórz dokumentację MCP <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </div>

      <h2 id="links">Spec dla maszyn</h2>
      <p>
        Możesz też wkleić agentowi (Claude/ChatGPT) bezpośrednio jeden z poniższych URL — od
        razu zrozumie strukturę bez konieczności czytania tej strony.
      </p>
      <ul>
        <li>
          <strong>OpenAPI 3.1:</strong>{" "}
          <a href={`${baseUrl}/openapi.json`} className="font-mono">
            {baseUrl}/openapi.json
          </a>
        </li>
        <li>
          <strong>Markdown (llms.txt):</strong>{" "}
          <a href={`${baseUrl}/llms.txt`} className="font-mono">
            {baseUrl}/llms.txt
          </a>
        </li>
        <li>
          <strong>MCP endpoint:</strong>{" "}
          <a href={`${baseUrl}/api/mcp`} className="font-mono">
            {baseUrl}/api/mcp
          </a>
        </li>
        <li>
          <strong>OAuth discovery:</strong>{" "}
          <a href={`${baseUrl}/.well-known/oauth-authorization-server`} className="font-mono">
            {baseUrl}/.well-known/oauth-authorization-server
          </a>
        </li>
      </ul>
    </DocsLayout>
  );
}
