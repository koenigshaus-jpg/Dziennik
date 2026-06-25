// Lista person (konsultantów) dla klienta — budowana z produktów WooCommerce.
// Za auth (proxy.ts). Klient używa do menu wyboru w czacie.

import { NextResponse } from "next/server";
import { getPersonaList } from "@/lib/agent/persona-source";

export const runtime = "nodejs";
export const revalidate = 60;

export async function GET() {
  try {
    return NextResponse.json({ personas: await getPersonaList() });
  } catch {
    return NextResponse.json({ personas: [] });
  }
}
