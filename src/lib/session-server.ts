import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  createSessionToken,
  verifySessionToken,
} from "./session";

function getSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET nie jest ustawiony (min. 16 znaków).");
  }
  return s;
}

export function getAppPassword(): string {
  const p = process.env.APP_PASSWORD;
  if (!p) throw new Error("APP_PASSWORD nie jest ustawiony.");
  return p;
}

export async function setSessionCookie() {
  const jar = await cookies();
  const token = await createSessionToken(getSecret());
  jar.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE_NAME);
}

export async function isLoggedIn(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token, getSecret());
}

// Flaga jest też ustawiona w proxy.ts. Trzymaj zsynchronizowane.
const AUTH_ENABLED = false;

export async function requireSession() {
  if (!AUTH_ENABLED) return;
  if (!(await isLoggedIn())) {
    throw new Response("Unauthorized", { status: 401 });
  }
}
