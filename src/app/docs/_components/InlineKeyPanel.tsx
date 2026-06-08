// Server wrapper — sprawdza sesję Supabase. Zalogowany → InlineKeyGenerator
// (client component). Niezalogowany → ApiKeyCallout (login CTA).

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";

import { ApiKeyCallout } from "./ApiKeyCallout";
import { InlineKeyGenerator } from "./InlineKeyGenerator";

export async function InlineKeyPanel() {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <ApiKeyCallout />;
  }
  return <InlineKeyGenerator userEmail={user.email ?? null} />;
}
