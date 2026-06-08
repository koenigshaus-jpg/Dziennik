// MCP server endpoint — używa `mcp-handler` (oficjalny pakiet Vercela).
//
// Auth: withMcpAuth + verifyMcpBearer (akceptuje sk_live_… oraz JWT z OAuth).
// Tools: rejestrowane z `mcpTools` registry (15 tools z entries-repo / chat-repo).

import {
  createMcpHandler,
  withMcpAuth,
} from "mcp-handler";
import { z } from "zod";

import { mcpTools } from "@/lib/api/mcp-tools";
import { verifyMcpBearer } from "@/lib/api/mcp-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    for (const t of mcpTools) {
      server.tool(t.name, t.description, t.inputSchema, async (args, extra) => {
        const userId = (extra?.authInfo?.extra as { userId?: string } | undefined)?.userId;
        if (!userId) {
          throw new Error("missing_user_in_auth_info");
        }
        try {
          const result = await t.execute(userId, args as Record<string, unknown>);
          return {
            content: [
              { type: "text" as const, text: JSON.stringify(result, null, 2) },
            ],
          };
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return {
            content: [{ type: "text" as const, text: `Error: ${msg}` }],
            isError: true,
          };
        }
      });
    }
  },
  {
    serverInfo: {
      name: "dziennik",
      version: "1.0.0",
    },
  },
  {
    basePath: "/api",
    verboseLogs: true,
    disableSse: true,
    maxDuration: 60,
  }
);

const authHandler = withMcpAuth(handler, async (req: Request, bearerToken?: string) => {
  // Wylicz audience dynamicznie z requesta — żeby zgadzał się z JWT issued.
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const audience = `${proto}://${host}/api/mcp`;
  return await verifyMcpBearer(bearerToken, audience);
}, {
  required: true,
  requiredScopes: ["dziennik:rw"],
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
// Silence unused var (z is required by tools — ts-checker happy)
void z;
