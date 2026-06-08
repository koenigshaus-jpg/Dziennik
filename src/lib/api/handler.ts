// Wrapper dla wszystkich route handlerów /api/v1/*. Łapie typowe błędy
// (auth, zod, generyczne) i zamienia na czysty JSON `{ error, detail? }`
// z odpowiednim kodem HTTP. Pozwala handlerom skupić się na logice.

import { NextResponse } from "next/server";
import { z } from "zod";

import { ApiAuthError, getApiUser, type AuthedUser } from "./auth";

export class ApiError extends Error {
  status: number;
  detail?: unknown;
  constructor(message: string, status = 400, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (
  req: Request,
  ctx: { user: AuthedUser; params: P }
) => Promise<Response | NextResponse> | Response | NextResponse;

/** Owijka: auth + try/catch + JSON-error. Użycie:
 *  `export const POST = withApiHandler<{}>(async (req, { user }) => { ... });`
 */
export function withApiHandler<P extends Record<string, string> = Record<string, never>>(
  handler: Handler<P>
) {
  return async (req: Request, ctx: Ctx<P> | undefined = undefined) => {
    try {
      const user = await getApiUser(req);
      const params = ctx?.params ? await ctx.params : ({} as P);
      return await handler(req, { user, params });
    } catch (err) {
      return toJsonError(err);
    }
  };
}

export function toJsonError(err: unknown): NextResponse {
  if (err instanceof ApiAuthError) {
    return NextResponse.json({ error: "unauthorized", detail: err.message }, { status: 401 });
  }
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: err.message, ...(err.detail !== undefined ? { detail: err.detail } : {}) },
      { status: err.status }
    );
  }
  if (err instanceof z.ZodError) {
    return NextResponse.json(
      { error: "invalid_request", detail: err.issues },
      { status: 400 }
    );
  }
  console.error("[api/v1] unhandled error:", err);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}

/** Parsuje body wg Zod schema. Rzuca `ApiError(400)` przy pustym/niepoprawnym JSON. */
export async function parseJson<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError("invalid_json", 400);
  }
  return schema.parse(raw);
}
