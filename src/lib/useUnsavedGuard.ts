"use client";

import * as React from "react";

interface PendingNav {
  proceed: () => void;
}

type HistoryFn = History["pushState"];

export function useUnsavedGuard(dirty: boolean): {
  pending: PendingNav | null;
  cancel: () => void;
  proceed: () => void;
} {
  const [pending, setPending] = React.useState<PendingNav | null>(null);
  const dirtyRef = React.useRef(dirty);
  React.useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  React.useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    const currentUrl = window.location.href;
    window.history.pushState({ __unsavedGuard: true }, "", currentUrl);

    const onPopState = () => {
      if (!dirtyRef.current) return;
      window.history.pushState({ __unsavedGuard: true }, "", currentUrl);
      setPending({
        proceed: () => {
          window.history.go(-2);
        },
      });
    };
    window.addEventListener("popstate", onPopState);

    const origPush = window.history.pushState.bind(window.history);
    const origReplace = window.history.replaceState.bind(window.history);

    const guardedPush: HistoryFn = (state, _unused, url) => {
      if (
        dirtyRef.current &&
        (!state || (state as { __unsavedGuard?: boolean }).__unsavedGuard !== true)
      ) {
        setPending({
          proceed: () => origPush(state, "", url ?? undefined),
        });
        return;
      }
      origPush(state, "", url ?? undefined);
    };
    const guardedReplace: HistoryFn = (state, _unused, url) => {
      if (
        dirtyRef.current &&
        (!state || (state as { __unsavedGuard?: boolean }).__unsavedGuard !== true)
      ) {
        setPending({
          proceed: () => origReplace(state, "", url ?? undefined),
        });
        return;
      }
      origReplace(state, "", url ?? undefined);
    };
    window.history.pushState = guardedPush;
    window.history.replaceState = guardedReplace;

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, [dirty]);

  return {
    pending,
    cancel: () => setPending(null),
    proceed: () => {
      const p = pending;
      setPending(null);
      p?.proceed();
    },
  };
}
