// MVP: jeden scope `dziennik:rw` (pełen dostęp do wpisów, tagów, rozmów).
// W przyszłości: `dziennik:read`, `dziennik:write`, `dziennik:chat` itp.

export const SUPPORTED_SCOPES = ["dziennik:rw"] as const;
export const DEFAULT_SCOPE = "dziennik:rw";

export type Scope = (typeof SUPPORTED_SCOPES)[number];

/** Parsuje `scope` z requesta (space-separated), filtruje nieznane, zwraca array. */
export function parseScopes(input: string | undefined | null): Scope[] {
  if (!input) return [DEFAULT_SCOPE];
  const parts = input.split(/\s+/).filter(Boolean);
  const valid = parts.filter((p): p is Scope =>
    (SUPPORTED_SCOPES as readonly string[]).includes(p)
  );
  return valid.length > 0 ? valid : [DEFAULT_SCOPE];
}

export function scopesToString(scopes: Scope[]): string {
  return scopes.join(" ");
}
