// Kontrakt warstwy LLM. Reszta aplikacji (route handlery, UI) NIE importuje
// żadnego SDK od dostawcy bezpośrednio — wszystko idzie przez ChatProvider.
// Zmiana providera = nowa implementacja interface'u + jedna linia w factory.

import type { ChatMessage } from "./types";

export interface ToolDefinition {
  /** Opis dla modelu — co robi to narzędzie i kiedy je wywołać. */
  description: string;
  /** JSON Schema parametrów. */
  parameters: Record<string, unknown>;
}

export interface ChatStreamOptions {
  systemPrompt: string;
  messages: ChatMessage[];
  model: string;
  temperature: number;
  tools?: Record<string, ToolDefinition>;
  abortSignal?: AbortSignal;
}

/**
 * Provider strumieniowo zwraca odpowiedź modelu jako standardowy Response
 * (Server-Sent Events / Data Stream Protocol). Klient (useChat z @ai-sdk/react)
 * konsumuje to bez świadomości tego, jaki SDK siedzi pod spodem.
 */
export interface ChatProvider {
  streamChat(opts: ChatStreamOptions): Response;
  /** Krótki, jednostrzałowy call do generowania tytułu rozmowy. */
  generateTitle(opts: {
    model: string;
    firstUserMessage: string;
    firstAssistantMessage: string;
  }): Promise<string>;
}
