// POST handler dla decyzji consent (accept/reject) → redirect na redirect_uri
// z code (accept) lub error (reject). Wymaga sesji Supabase.

import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getClient, isValidRedirectUri } from "@/lib/api/oauth/clients";
import { issueAuthorizationCode } from "@/lib/api/oauth/codes";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData();
  const decision = String(form.get("decision") ?? "");
  const clientId = String(form.get("client_id") ?? "");
  const redirectUri = String(form.get("redirect_uri") ?? "");
  const state = String(form.get("state") ?? "");
  const codeChallenge = String(form.get("code_challenge") ?? "");
  const scope = String(form.get("scope") ?? "dziennik:rw");
  const resource = String(form.get("resource") ?? "");

  if (!clientId || !redirectUri || !codeChallenge) {
    return badRequest("missing_parameters");
  }
  if (decision !== "accept" && decision !== "reject") {
    return badRequest("invalid_decision");
  }

  // Re-validate (defense in depth — form values can be tampered)
  const client = await getClient(clientId);
  if (!client) return badRequest("invalid_client");
  if (!isValidRedirectUri(client, redirectUri)) return badRequest("invalid_redirect_uri");

  const redirect = new URL(redirectUri);
  if (state) redirect.searchParams.set("state", state);

  if (decision === "reject") {
    redirect.searchParams.set("error", "access_denied");
    return NextResponse.redirect(redirect.toString(), { status: 302 });
  }

  // Issue code
  const { code } = await issueAuthorizationCode({
    client_id: clientId,
    user_id: user.id,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    scope,
    resource: resource || undefined,
  });

  redirect.searchParams.set("code", code);
  return NextResponse.redirect(redirect.toString(), { status: 302 });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}
