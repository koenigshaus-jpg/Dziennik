"use client";

import * as React from "react";

import { AgentSheet } from "./AgentSheet";

interface OpenOptions {
  day: string;
  initialMessage?: string;
}

interface AgentSheetContextValue {
  open: boolean;
  openSheet: (opts: OpenOptions) => void;
  closeSheet: () => void;
}

const AgentSheetContext = React.createContext<AgentSheetContextValue | null>(
  null
);

export function useAgentSheet(): AgentSheetContextValue {
  const ctx = React.useContext(AgentSheetContext);
  if (!ctx) {
    throw new Error(
      "useAgentSheet musi być wywołany wewnątrz <AgentSheetProvider>"
    );
  }
  return ctx;
}

interface State {
  open: boolean;
  day: string;
  initialMessage: string | undefined;
  /** Każde otwarcie podbija kluczem — pozwala AgentSheet zresetować useChat. */
  openKey: number;
}

export function AgentSheetProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = React.useState<State>({
    open: false,
    day: todayIso(),
    initialMessage: undefined,
    openKey: 0,
  });

  const openSheet = React.useCallback((opts: OpenOptions) => {
    setState((s) => ({
      open: true,
      day: opts.day,
      initialMessage: opts.initialMessage,
      openKey: s.openKey + 1,
    }));
  }, []);

  const closeSheet = React.useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const value = React.useMemo<AgentSheetContextValue>(
    () => ({ open: state.open, openSheet, closeSheet }),
    [state.open, openSheet, closeSheet]
  );

  return (
    <AgentSheetContext.Provider value={value}>
      {children}
      {state.open && (
        <AgentSheet
          key={state.openKey}
          day={state.day}
          initialMessage={state.initialMessage}
          onClose={closeSheet}
        />
      )}
    </AgentSheetContext.Provider>
  );
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
