/**
 * Route handler zapisu wpisów do Strapi (źródło prawdy).
 * Trzyma token Strapi po stronie serwera. Klient (db-supabase.ts) woła te metody
 * zamiast pisać wpisy bezpośrednio do Supabase. Most Strapi→Supabase odbija treść
 * i uruchamia wektoryzację.
 *
 * MULTI-USER — bezpieczeństwo:
 * - właściciel (userId) bierze się z ZALOGOWANEJ sesji Supabase (cookies), nigdy
 *   z ciała żądania — klient nie może podszyć się pod innego usera;
 * - PUT/DELETE weryfikują własność: wpis musi być widoczny dla usera przez RLS
 *   (SELECT po id na jego kliencie) — inaczej 403. To blokuje przejęcie/kasowanie
 *   cudzego wpisu po zgadniętym entryId.
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/server";
import {
  createStrapiEntry,
  updateStrapiEntry,
  deleteStrapiEntry,
  type StrapiEntryInput,
} from "@/lib/strapi-server";

export const runtime = "nodejs";

function parseEntry(body: unknown, userId: string): StrapiEntryInput {
  const b = (body ?? {}) as Partial<StrapiEntryInput>;
  if (!b.entryId || typeof b.entryId !== "string") {
    throw new Error("Brak entryId.");
  }
  return {
    entryId: b.entryId,
    userId, // z sesji, nie z ciała żądania
    contentHtml: b.contentHtml ?? "",
    contentText: b.contentText ?? "",
    mood: b.mood ?? null,
    tags: Array.isArray(b.tags) ? b.tags : [],
    createdAt: b.createdAt ?? new Date().toISOString(),
  };
}

async function getUserId(): Promise<{ userId: string } | { error: NextResponse }> {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Nie zalogowano." }, { status: 401 }) };
  }
  return { userId: user.id };
}

/** Czy zalogowany user jest właścicielem wpisu? RLS zwróci wiersz tylko dla właściciela. */
async function ownsEntry(entryId: string): Promise<boolean> {
  const supabase = await createSupabaseRouteHandlerClient();
  const { data, error } = await supabase
    .from("entries")
    .select("id")
    .eq("id", entryId)
    .maybeSingle();
  return !error && !!data;
}

export async function POST(req: NextRequest) {
  const auth = await getUserId();
  if ("error" in auth) return auth.error;
  try {
    // entryId to świeży UUID z klienta; unikalność entryId w Strapi blokuje kolizję
    // z cudzym wpisem (create rzuci przy duplikacie).
    await createStrapiEntry(parseEntry(await req.json(), auth.userId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await getUserId();
  if ("error" in auth) return auth.error;
  try {
    const input = parseEntry(await req.json(), auth.userId);
    if (!(await ownsEntry(input.entryId))) {
      return NextResponse.json({ error: "Brak dostępu do wpisu." }, { status: 403 });
    }
    await updateStrapiEntry(input);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await getUserId();
  if ("error" in auth) return auth.error;
  try {
    const entryId = req.nextUrl.searchParams.get("entryId");
    if (!entryId) return NextResponse.json({ error: "Brak entryId." }, { status: 400 });
    if (!(await ownsEntry(entryId))) {
      return NextResponse.json({ error: "Brak dostępu do wpisu." }, { status: 403 });
    }
    await deleteStrapiEntry(entryId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
