// Consent screen — zalogowany user widzi "Klient X chce dostępu do dziennika".
// Wymaga sesji Supabase. Bez sesji → redirect na /login?next=... .

import { redirect } from "next/navigation";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getClient, isValidRedirectUri } from "@/lib/api/oauth/clients";
import { ConsentForm } from "./_components/ConsentForm";

export const runtime = "nodejs";

interface SearchParams {
  [key: string]: string | string[] | undefined;
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = normalizeParams(params);

  // 0) Auth — bez sesji redirect na /login
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = "/oauth/authorize?" + queryToString(q);
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  // 1) Walidacja query
  const error = validateRequest(q);
  if (error) {
    return <OAuthError error={error.code} description={error.description} />;
  }

  // 2) Walidacja klienta
  const client = await getClient(q.client_id!);
  if (!client) {
    return <OAuthError error="invalid_client" description="Nieznany client_id." />;
  }
  if (!isValidRedirectUri(client, q.redirect_uri!)) {
    return (
      <OAuthError
        error="invalid_redirect_uri"
        description={`redirect_uri nie jest zarejestrowany dla tego klienta.`}
      />
    );
  }

  // 3) Render consent form (POST → /oauth/authorize/decision)
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-sm">
        <h1 className="text-2xl font-display font-bold mb-1">Autoryzacja dostępu</h1>
        <p className="text-sm text-muted mb-6">
          Zalogowany jako <strong>{user.email ?? user.id}</strong>
        </p>

        <div className="mb-6 rounded-xl border border-border p-4">
          <p className="text-sm">
            <strong className="text-foreground">{client.client_name}</strong> prosi o dostęp do
            Twojego dziennika.
          </p>
          <p className="text-xs text-muted mt-2 break-all">
            Po autoryzacji wrócisz do: <code className="font-mono">{q.redirect_uri}</code>
          </p>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium mb-2">Aplikacja będzie mogła:</p>
          <ul className="text-sm space-y-1 text-foreground/85 list-disc pl-5">
            <li>Czytać i tworzyć Twoje wpisy</li>
            <li>Zarządzać tagami i nastrojem</li>
            <li>Rozmawiać z asystentem AI w Twoim imieniu</li>
            <li>Czytać i kasować historię rozmów</li>
          </ul>
          <p className="text-xs text-muted mt-3">
            Możesz odwołać dostęp w każdej chwili przez unieważnienie kluczy w{" "}
            <a href="/ustawienia/api" className="underline">ustawieniach</a>.
          </p>
        </div>

        <ConsentForm
          clientId={q.client_id!}
          redirectUri={q.redirect_uri!}
          state={q.state ?? ""}
          codeChallenge={q.code_challenge!}
          scope={q.scope ?? "dziennik:rw"}
          resource={q.resource ?? ""}
        />
      </div>
    </main>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

interface NormalizedQuery {
  client_id?: string;
  redirect_uri?: string;
  response_type?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  state?: string;
  scope?: string;
  resource?: string;
}

function normalizeParams(sp: SearchParams): NormalizedQuery {
  const get = (k: string) => {
    const v = sp[k];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  return {
    client_id: get("client_id"),
    redirect_uri: get("redirect_uri"),
    response_type: get("response_type"),
    code_challenge: get("code_challenge"),
    code_challenge_method: get("code_challenge_method"),
    state: get("state"),
    scope: get("scope"),
    resource: get("resource"),
  };
}

function queryToString(q: NormalizedQuery): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v) sp.set(k, v);
  }
  return sp.toString();
}

function validateRequest(q: NormalizedQuery): { code: string; description: string } | null {
  if (!q.client_id) return { code: "invalid_request", description: "Brak client_id." };
  if (!q.redirect_uri) return { code: "invalid_request", description: "Brak redirect_uri." };
  if (q.response_type !== "code") return { code: "unsupported_response_type", description: "Wymagane: response_type=code." };
  if (!q.code_challenge) return { code: "invalid_request", description: "Brak code_challenge (PKCE wymagane)." };
  if (q.code_challenge_method !== "S256") return { code: "invalid_request", description: "code_challenge_method musi być S256." };
  return null;
}

function OAuthError({ error, description }: { error: string; description: string }) {
  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-rose-500/5 p-6">
        <h1 className="text-xl font-semibold mb-2">Błąd autoryzacji</h1>
        <p className="text-sm font-mono text-rose-300 mb-2">{error}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
    </main>
  );
}
