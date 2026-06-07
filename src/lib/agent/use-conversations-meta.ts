// Hook agregujący meta o rozmowach (po dniach) dla całej aplikacji.
// Czyta wszystkie rozmowy z IndexedDB, grupuje po dniu i nasłuchuje na
// `conversations-changed` żeby się odświeżyć.
//
// Zwraca:
//  - daysWithConversations: Set<string> (dni YYYY-MM-DD)
//  - personasByDay:        Map<string, PersonaKey[]> (kolejność = updatedAt desc)
//  - conversationsByDay:   Map<string, Conversation[]>
//
// Komponenty: kalendarz (kropka), karty wpisu (badge persony), strona ustawień
// (lista historii).

"use client";

import * as React from "react";

import {
  listConversations,
  type Conversation,
} from "@/lib/conversations-client";
import type { PersonaKey } from "./types";

interface Meta {
  conversations: Conversation[];
  daysWithConversations: Set<string>;
  personasByDay: Map<string, PersonaKey[]>;
  conversationsByDay: Map<string, Conversation[]>;
}

const EMPTY_META: Meta = {
  conversations: [],
  daysWithConversations: new Set(),
  personasByDay: new Map(),
  conversationsByDay: new Map(),
};

function buildMeta(conversations: Conversation[]): Meta {
  const days = new Set<string>();
  const personas = new Map<string, PersonaKey[]>();
  const convByDay = new Map<string, Conversation[]>();
  // Sortowane: najświeższe na początku (przyda się do kolejności badge'y).
  const sorted = [...conversations].sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
  for (const c of sorted) {
    days.add(c.day);
    const list = convByDay.get(c.day) ?? [];
    list.push(c);
    convByDay.set(c.day, list);
    const personasForDay = personas.get(c.day) ?? [];
    if (!personasForDay.includes(c.personaKey)) {
      personasForDay.push(c.personaKey);
    }
    personas.set(c.day, personasForDay);
  }
  return {
    conversations: sorted,
    daysWithConversations: days,
    personasByDay: personas,
    conversationsByDay: convByDay,
  };
}

export function useConversationsMeta(): Meta {
  const [meta, setMeta] = React.useState<Meta>(EMPTY_META);

  const refresh = React.useCallback(async () => {
    try {
      const all = await listConversations();
      setMeta(buildMeta(all));
    } catch (e) {
      console.error("useConversationsMeta refresh failed:", e);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    const handler = () => {
      void refresh();
    };
    window.addEventListener("conversations-changed", handler);
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener("conversations-changed", handler);
      window.removeEventListener("focus", handler);
    };
  }, [refresh]);

  return meta;
}
