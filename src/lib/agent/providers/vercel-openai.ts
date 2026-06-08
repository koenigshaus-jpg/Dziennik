// Implementacja ChatProvider używająca Vercel AI SDK + @ai-sdk/openai.
// Zmiana na innego dostawcę (Anthropic, Gemini, surowy openai SDK) =
// nowy plik w tym katalogu + zmiana jednej linii w ../index.ts.

import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";

import type { ChatProvider, ChatStreamOptions } from "../provider";

export const vercelOpenAiProvider: ChatProvider = {
  async streamChat(opts: ChatStreamOptions): Promise<Response> {
    const modelMessages = await convertToModelMessages(
      opts.messages as UIMessage[]
    );
    const result = streamText({
      model: openai(opts.model),
      system: opts.systemPrompt,
      messages: modelMessages,
      temperature: opts.temperature,
      // Narzędzia są zdefiniowane w src/lib/agent/tools/ używając tool() z 'ai'.
      // Przekazujemy je tu jako passthrough — typowanie luźne, bo provider
      // interface świadomie nie wie o typach SDK.
      tools: opts.tools as Parameters<typeof streamText>[0]["tools"],
      // Bez tego AI SDK v6 kończy generowanie po pierwszym tool callu i model
      // nigdy nie zobaczy wyniku fetchEntry — agent przestaje "widzieć" wpisy.
      stopWhen: stepCountIs(8),
      abortSignal: opts.abortSignal,
    });

    // SSE / UI Message Stream zgodny z @ai-sdk/react useChat.
    return result.toUIMessageStreamResponse();
  },

  async generateTitle(opts): Promise<string> {
    const result = await generateText({
      model: openai(opts.model),
      system:
        "Wygeneruj zwięzły 3-5 słowny tytuł rozmowy po polsku, opisujący jej główny temat. Zwróć WYŁĄCZNIE tytuł, bez cudzysłowów, bez kropki na końcu, bez prefixu.",
      messages: [
        {
          role: "user",
          content: `Pytanie użytkownika: ${opts.firstUserMessage}\n\nOdpowiedź asystenta: ${opts.firstAssistantMessage}`,
        },
      ],
      temperature: 0.3,
    });
    return result.text.trim().replace(/^["„'']|["”'']$|\.$/g, "");
  },
};
