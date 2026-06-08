// Internal route — używa sesji Supabase (cookie), NIE bierze API-key auth.
// Wykorzystywany WYŁĄCZNIE przez stronę /ustawienia/api w aplikacji.

import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/api/supabase-admin";
import {
  API_KEY_PREFIX_SHOW,
  generateApiKey,
  hashApiKey,
} from "@/lib/api/auth";

export const runtime = "nodejs";

async function requireUser() {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return user;
}

export async function GET() {
  try {
    const user = await requireUser();
    const { data, error } = await getSupabaseAdmin()
      .from("api_keys")
      .select("id, name, prefix, created_at, last_used_at, revoked_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      return NextResponse.json({ error: "list_failed", detail: error.message }, { status: 500 });
    }
    return NextResponse.json({ keys: data ?? [] });
  } catch (r) {
    return r as Response;
  }
}

const createSchema = z.object({ name: z.string().min(1).max(80) });

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_request", detail: parsed.error.issues },
        { status: 400 }
      );
    }
    const token = generateApiKey();
    const hash = hashApiKey(token);
    const prefix = token.slice(0, API_KEY_PREFIX_SHOW);

    const { data, error } = await getSupabaseAdmin()
      .from("api_keys")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        prefix,
        hash,
      })
      .select("id, name, prefix, created_at")
      .single();
    if (error) {
      return NextResponse.json({ error: "create_failed", detail: error.message }, { status: 500 });
    }
    // ZWRACAMY PEŁNY TOKEN TYLKO TU — później niewidoczny.
    return NextResponse.json({ key: data, token });
  } catch (r) {
    return r as Response;
  }
}
