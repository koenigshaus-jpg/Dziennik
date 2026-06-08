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

export function ConsentForm(props: Props) {
  const [submitting, setSubmitting] = React.useState<"accept" | "reject" | null>(null);

  function submit(decision: "accept" | "reject") {
    return (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(decision);
      const form = e.currentTarget as HTMLFormElement;
      form.action = "/oauth/authorize/decision";
      form.method = "POST";
      // Add decision field
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "decision";
      input.value = decision;
      form.appendChild(input);
      form.submit();
    };
  }

  return (
    <form className="flex flex-col gap-3">
      <input type="hidden" name="client_id" value={props.clientId} />
      <input type="hidden" name="redirect_uri" value={props.redirectUri} />
      <input type="hidden" name="state" value={props.state} />
      <input type="hidden" name="code_challenge" value={props.codeChallenge} />
      <input type="hidden" name="scope" value={props.scope} />
      <input type="hidden" name="resource" value={props.resource} />

      <Button
        type="submit"
        onClick={submit("accept")}
        disabled={submitting !== null}
        className="w-full"
      >
        {submitting === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Autoryzuj
      </Button>
      <Button
        type="submit"
        variant="outline"
        onClick={submit("reject")}
        disabled={submitting !== null}
        className="w-full"
      >
        Odrzuć
      </Button>
    </form>
  );
}
