import { NextResponse } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/api/supabase-admin";

export const runtime = "nodejs";

/** Unieważnienie klucza — set `revoked_at = now()`. Klucz nie jest kasowany,
 *  żeby ewentualne logi/diagnostyka miały historię. */
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "revoke_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ revoked: true });
}
