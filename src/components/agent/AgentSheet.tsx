"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  type UIMessage,
  type ToolUIPart,
} from "ai";
import { X, MoreHorizontal, MessageSquarePlus, Trash2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { AgentPersonaMenu } from "./AgentPersonaMenu";
import { BrutalEditorWarning } from "./BrutalEditorWarning";
import { AgentMarkdown } from "./AgentMarkdown";

import {
  getDefaultPersona,
  getVariantPreference,
  setVariantPreference,
  setDefaultPersona,
  getDeepMode,
  hasSeenBrutalWarning,
} from "@/lib/agent/client-state";
import { getPersona, getVariant } from "@/lib/agent/personas";
import type { PersonaKey } from "@/lib/agent/types";
import { buildEntriesContext } from "@/lib/agent/entries-context";
import { getEntry } from "@/lib/db-client";
import {
  appendMessage,
  createConversation,
  deleteConversation as deleteConversationDb,
  getConversation,
  listConversationsByDayAndPersona,
  setTitle as setConversationTitle,
  type Conversation,
  type ConversationMessage,
} from "@/lib/conversations-client";

interface Props {
  day: string;
  initialMessage?: string;
  onClose: () => void;
}

export function AgentSheet({ day, initialMessage, onClose }: Props) {
  const [personaKey, setPersonaKey] = React.useState<PersonaKey>(() =>
    getDefaultPersona()
  );
  const [variantId, setVariantId] = React.useState<string>(() =>
    getVariantPreference(getDefaultPersona())
  );
  const [conversationId, setConversationId] = React.useState<string | null>(
    null
  );
  const [initialMessages, setInitialMessages] = React.useState<
    ConversationMessage[]
  >([]);
  const [conversationLoaded, setConversationLoaded] = React.useState(false);
  const [pendingBrutal, setPendingBrutal] = React.useState<{
    personaKey: PersonaKey;
    variantId: string;
  } | null>(null);

  // Esc zamyka sheet.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Wczytuje ostatnią rozmowę dla (day, persona) — albo gotowi do utworzenia nowej.
  React.useEffect(() => {
    let cancelled = false;
    setConversationLoaded(false);
    (async () => {
      const list = await listConversationsByDayAndPersona(day, personaKey);
      if (cancelled) return;
      if (list.length > 0) {
        const latest = list[0];
        setConversationId(latest.id);
        setInitialMessages(latest.messages);
        setVariantId(latest.personaVariant); // sync wariant z aktualną rozmową
      } else {
        setConversationId(null);
        setInitialMessages([]);
      }
      setConversationLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [day, personaKey]);

  const handleSelectPersona = React.useCallback(
    (key: PersonaKey, vId: string) => {
      // Brutalny redaktor — modal jednorazowo.
      if (
        key === "creative" &&
        vId === "brutal-editor" &&
        !hasSeenBrutalWarning()
      ) {
        setPendingBrutal({ personaKey: key, variantId: vId });
        return;
      }
      setVariantPreference(key, vId);
      setDefaultPersona(key);
      setPersonaKey(key);
      setVariantId(vId);
    },
    []
  );

  const handleNewConversation = React.useCallback(() => {
    setConversationId(null);
    setInitialMessages([]);
    // Reset key (poprzez setConversationLoaded toggling) zostawiamy AgentChatInstance.
    setConversationLoaded(false);
    setTimeout(() => setConversationLoaded(true), 0);
  }, []);

  const handleDeleteConversation = React.useCallback(async () => {
    if (!conversationId) return;
    if (
      !window.confirm(
        "Usunąć tę rozmowę? Wiadomości znikną bezpowrotnie."
      )
    )
      return;
    await deleteConversationDb(conversationId);
    setConversationId(null);
    setInitialMessages([]);
    setConversationLoaded(false);
    setTimeout(() => setConversationLoaded(true), 0);
    toast.message("Rozmowa usunięta.");
  }, [conversationId]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "fixed z-40 bg-background border border-border shadow-2xl flex flex-col",
          // Mobile: bottom sheet ~85vh
          "left-0 right-0 bottom-0 rounded-t-2xl max-h-[85vh] h-[85vh]",
          // Desktop: centered, węższy, nad ComposerBar
          "lg:left-1/2 lg:right-auto lg:bottom-20 lg:-translate-x-1/2 lg:rounded-2xl lg:w-[min(720px,90vw)] lg:h-[min(80vh,720px)] lg:max-h-[80vh]"
        )}
        role="dialog"
        aria-modal
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 lg:px-4 py-2.5 border-b border-border">
          <AgentPersonaMenu
            personaKey={personaKey}
            variantId={variantId}
            onSelect={handleSelectPersona}
          />
          <div className="flex-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-foreground/5 text-muted"
                aria-label="Menu rozmowy"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={handleNewConversation}>
                <MessageSquarePlus className="h-4 w-4" />
                Nowa rozmowa
              </DropdownMenuItem>
              {conversationId && (
                <DropdownMenuItem
                  onSelect={handleDeleteConversation}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Usuń rozmowę
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-foreground/5 text-muted"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Chat instance — przeładowuje się przy zmianie persony / rozmowy. */}
        {conversationLoaded ? (
          <AgentChatInstance
            key={`${conversationId ?? "new"}-${personaKey}-${variantId}`}
            day={day}
            personaKey={personaKey}
            variantId={variantId}
            existingConversationId={conversationId}
            existingMessages={initialMessages}
            initialMessage={initialMessage}
            onConversationCreated={(id) => setConversationId(id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>

      <BrutalEditorWarning
        open={!!pendingBrutal}
        onCancel={() => setPendingBrutal(null)}
        onConfirm={() => {
          if (!pendingBrutal) return;
          setVariantPreference(
            pendingBrutal.personaKey,
            pendingBrutal.variantId
          );
          setDefaultPersona(pendingBrutal.personaKey);
          setPersonaKey(pendingBrutal.personaKey);
          setVariantId(pendingBrutal.variantId);
          setPendingBrutal(null);
        }}
      />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// AgentChatInstance — wewnętrzny komponent który trzyma useChat.
// Remontowany przez `key` w rodzicu, co czyści stan przy zmianie persony.
// ──────────────────────────────────────────────────────────────────────────

interface InstanceProps {
  day: string;
  personaKey: PersonaKey;
  variantId: string;
  existingConversationId: string | null;
  existingMessages: ConversationMessage[];
  initialMessage?: string;
  onConversationCreated: (id: string) => void;
}

function uiMessageFromStored(m: ConversationMessage): UIMessage {
  return {
    id: m.id,
    role: m.role,
    parts: [{ type: "text", text: m.content }],
  };
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function AgentChatInstance({
  day,
  personaKey,
  variantId,
  existingConversationId,
  existingMessages,
  initialMessage,
  onConversationCreated,
}: InstanceProps) {
  const persona = getPersona(personaKey);
  const variant = getVariant(personaKey, variantId);
  const conversationIdRef = React.useRef<string | null>(existingConversationId);
  const titleGeneratedRef = React.useRef<boolean>(
    existingMessages.some((m) => m.role === "assistant") &&
      existingMessages.filter((m) => m.role === "assistant").length >= 2
  );
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async ({ messages }) => {
          const { dayEntries, entriesIndex } = await buildEntriesContext(day);
          const plain = messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: extractText(m),
          }));
          return {
            body: {
              messages: plain,
              personaKey,
              personaVariant: variantId,
              deepMode: getDeepMode(personaKey),
              day,
              dayEntries,
              entriesIndex,
            },
          };
        },
      }),
    [day, personaKey, variantId]
  );

  const { messages, sendMessage, status, error, addToolResult, stop } =
    useChat({
      messages: existingMessages.map(uiMessageFromStored),
      transport,
      onToolCall: async ({ toolCall }) => {
        if (toolCall.toolName === "fetchEntry") {
          const id = (toolCall.input as { id: string }).id;
          const entry = await getEntry(id);
          const result = entry
            ? {
                id: entry.id,
                createdAt: new Date(entry.createdAt).toISOString(),
                plainText: entry.contentText,
                mood: entry.mood ?? null,
                tags: entry.tags,
              }
            : { error: "Wpis nie znaleziony." };
          await addToolResult({
            tool: "fetchEntry",
            toolCallId: toolCall.toolCallId,
            output: result,
          });
        }
      },
      onFinish: async ({ message }) => {
        try {
          // Upewnij się że istnieje rozmowa.
          let convId = conversationIdRef.current;
          if (!convId) {
            const created = await createConversation({
              day,
              personaKey,
              personaVariant: variantId,
            });
            convId = created.id;
            conversationIdRef.current = convId;
            onConversationCreated(convId);
          }
          // Zapisz assistant message (ostatnia user już zapisana w handleSend).
          const text = extractText(message as UIMessage);
          if (text.trim()) {
            await appendMessage(convId, {
              role: "assistant",
              content: text,
              status: "ok",
            });
          }
          // Auto-tytuł po 2. odpowiedzi assistant.
          if (!titleGeneratedRef.current && convId) {
            const conv = await getConversation(convId);
            if (conv) {
              const assistantMsgs = conv.messages.filter(
                (m) => m.role === "assistant"
              );
              if (assistantMsgs.length >= 2) {
                titleGeneratedRef.current = true;
                void generateAndSaveTitle(convId, conv);
              }
            }
          }
        } catch (e) {
          console.error("Persist assistant message failed:", e);
        }
      },
      onError: (e) => {
        console.error("useChat error:", e);
      },
    });

  // Wyślij initialMessage z ComposerBar przy pierwszym otwarciu.
  const initialSentRef = React.useRef(false);
  React.useEffect(() => {
    if (
      initialMessage &&
      initialMessage.trim() &&
      !initialSentRef.current &&
      messages.length === existingMessages.length
    ) {
      initialSentRef.current = true;
      void handleSend(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoscroll do dołu na nowe wiadomości.
  React.useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, status]);

  const [input, setInput] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    // Stwórz rozmowę przed pierwszą wiadomością jeśli nie istnieje.
    let convId = conversationIdRef.current;
    if (!convId) {
      const created = await createConversation({
        day,
        personaKey,
        personaVariant: variantId,
      });
      convId = created.id;
      conversationIdRef.current = convId;
      onConversationCreated(convId);
    }
    await appendMessage(convId, {
      role: "user",
      content: trimmed,
      status: "ok",
    });
    setInput("");
    void sendMessage({ text: trimmed });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend(input);
    }
  }

  function adjustHeight(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }

  React.useEffect(() => {
    adjustHeight(inputRef.current);
  }, [input]);

  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 lg:px-4 py-4 space-y-3"
      >
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted py-8">
            <div className="font-medium text-foreground/80 mb-1">
              {persona.name} · {variant.name}
            </div>
            <p>{variant.description}</p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isStreaming && (
          <div className="flex items-center gap-2 text-xs text-muted">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Asystent pisze…</span>
            <button
              type="button"
              onClick={() => stop()}
              className="ml-2 underline hover:text-foreground"
            >
              Przerwij
            </button>
          </div>
        )}
        {error && (
          <div className="text-xs text-destructive">
            Błąd: {error.message ?? "nieznany"}.
          </div>
        )}
      </div>

      {/* Input rozmowy */}
      <div className="border-t border-border px-3 lg:px-4 py-2.5 bg-background">
        <div className="flex items-end gap-2">
          <textarea
            ref={(el) => {
              inputRef.current = el;
              adjustHeight(el);
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Napisz wiadomość…"
            rows={1}
            disabled={isStreaming}
            className="flex-1 resize-none bg-foreground/5 rounded-2xl border-0 outline-none focus:ring-0 text-sm leading-6 py-2 px-3 placeholder:text-muted/70"
          />
          <Button
            type="button"
            size="icon"
            className="rounded-full h-10 w-10 shrink-0"
            onClick={() => void handleSend(input)}
            disabled={!input.trim() || isStreaming}
            aria-label="Wyślij"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const text = extractText(message);
  // Tool invocations renderujemy dyskretnie jako "Pobiera wpis…".
  const toolParts = message.parts.filter(
    (p): p is ToolUIPart =>
      typeof p.type === "string" && p.type.startsWith("tool-")
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words",
          isUser
            ? "bg-foreground text-background whitespace-pre-wrap"
            : "bg-foreground/5 text-foreground"
        )}
      >
        {isUser ? (
          text || (toolParts.length > 0 ? "…" : null)
        ) : text ? (
          <AgentMarkdown text={text} />
        ) : toolParts.length > 0 ? (
          "…"
        ) : null}
      </div>
      {toolParts.length > 0 && (
        <div className="text-[10px] text-muted px-2">
          {toolParts.map((tp, i) => {
            const toolName = tp.type.replace(/^tool-/, "");
            return (
              <div key={i}>
                {toolName === "fetchEntry" ? "Czyta wpis…" : `Narzędzie: ${toolName}`}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function generateAndSaveTitle(
  conversationId: string,
  conv: Conversation
): Promise<void> {
  try {
    const firstUser = conv.messages.find((m) => m.role === "user");
    const firstAssistant = conv.messages.find((m) => m.role === "assistant");
    if (!firstUser || !firstAssistant) return;
    const res = await fetch("/api/chat/title", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstUserMessage: firstUser.content,
        firstAssistantMessage: firstAssistant.content,
      }),
    });
    if (!res.ok) return;
    const { title } = (await res.json()) as { title: string };
    if (title && title.trim()) {
      await setConversationTitle(conversationId, title.trim());
    }
  } catch (e) {
    console.error("Title generation failed:", e);
  }
}
