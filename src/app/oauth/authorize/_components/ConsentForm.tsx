"use client";

import * as React from "react";

interface Props {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope: string;
  resource: string;
}

/**
 * NATYWNY HTML form — zero zależności od React Button / Slot / forwardRef.
 * Dwa <button type="submit"> z `name="decision"`. Spinner via React state.
 */
export function ConsentForm(props: Props) {
  const [submitting, setSubmitting] = React.useState<"accept" | "reject" | null>(null);

  return (
    <form
      action="/oauth/authorize/decision"
      method="POST"
      className="flex flex-col gap-3"
      onSubmit={() => {
        // dla diagnostyki w DevTools
        console.log("[ConsentForm] submitting", submitting);
      }}
    >
      <input type="hidden" name="client_id" value={props.clientId} />
      <input type="hidden" name="redirect_uri" value={props.redirectUri} />
      <input type="hidden" name="state" value={props.state} />
      <input type="hidden" name="code_challenge" value={props.codeChallenge} />
      <input type="hidden" name="scope" value={props.scope} />
      <input type="hidden" name="resource" value={props.resource} />

      <button
        type="submit"
        name="decision"
        value="accept"
        onClick={() => setSubmitting("accept")}
        disabled={submitting !== null}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-foreground text-background text-sm font-medium hover:bg-foreground/90 disabled:opacity-60 disabled:pointer-events-none"
      >
        {submitting === "accept" ? (
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : null}
        Autoryzuj
      </button>
      <button
        type="submit"
        name="decision"
        value="reject"
        onClick={() => setSubmitting("reject")}
        disabled={submitting !== null}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-border bg-transparent text-sm font-medium hover:bg-foreground/5 disabled:opacity-60 disabled:pointer-events-none"
      >
        Odrzuć
      </button>
    </form>
  );
}
