"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface Props {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  scope: string;
  resource: string;
}

/** Natywny HTML form — dwa buttony submit z `name="decision"` przekazują wybór. */
export function ConsentForm(props: Props) {
  const [submitting, setSubmitting] = React.useState<"accept" | "reject" | null>(null);

  return (
    <form action="/oauth/authorize/decision" method="POST" className="flex flex-col gap-3">
      <input type="hidden" name="client_id" value={props.clientId} />
      <input type="hidden" name="redirect_uri" value={props.redirectUri} />
      <input type="hidden" name="state" value={props.state} />
      <input type="hidden" name="code_challenge" value={props.codeChallenge} />
      <input type="hidden" name="scope" value={props.scope} />
      <input type="hidden" name="resource" value={props.resource} />

      <Button
        type="submit"
        name="decision"
        value="accept"
        onClick={() => setSubmitting("accept")}
        disabled={submitting !== null}
        className="w-full"
      >
        {submitting === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Autoryzuj
      </Button>
      <Button
        type="submit"
        name="decision"
        value="reject"
        variant="outline"
        onClick={() => setSubmitting("reject")}
        disabled={submitting !== null}
        className="w-full"
      >
        {submitting === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Odrzuć
      </Button>
    </form>
  );
}
