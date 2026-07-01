/**
 * Route handler zapisu wpisów do Strapi (źródło prawdy).
 * Trzyma token Strapi po stronie serwera. Klient (db-supabase.ts) woła te metody
 * zamiast pisać wpisy bezpośrednio do Supabase. Most Strapi→Supabase odbija treść
 * i uruchamia wektoryzację.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  createStrapiEntry,
  updateStrapiEntry,
  deleteStrapiEntry,
  type StrapiEntryInput,
} from "@/lib/strapi-server";

export const runtime = "nodejs";

function parseEntry(body: unknown): StrapiEntryInput {
  const b = (body ?? {}) as Partial<StrapiEntryInput>;
  if (!b.entryId || typeof b.entryId !== "string") {
    throw new Error("Brak entryId.");
  }
  return {
    entryId: b.entryId,
    contentHtml: b.contentHtml ?? "",
    contentText: b.contentText ?? "",
    mood: b.mood ?? null,
    tags: Array.isArray(b.tags) ? b.tags : [],
    createdAt: b.createdAt ?? new Date().toISOString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    await createStrapiEntry(parseEntry(await req.json()));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await updateStrapiEntry(parseEntry(await req.json()));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const entryId = req.nextUrl.searchParams.get("entryId");
    if (!entryId) return NextResponse.json({ error: "Brak entryId." }, { status: 400 });
    await deleteStrapiEntry(entryId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
