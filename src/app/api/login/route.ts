import { NextResponse } from "next/server";
import { getAppPassword, setSessionCookie } from "@/lib/session-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password || password !== getAppPassword()) {
    return NextResponse.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
  }

  await setSessionCookie();
  return NextResponse.json({ ok: true });
}
