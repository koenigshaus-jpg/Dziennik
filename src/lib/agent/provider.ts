// Kontrakt warstwy LLM. Reszta aplikacji (route handlery, UI) NIE importuje
// żadnego SDK od dostawcy bezpośrednio — wszystko idzie przez ChatProvider.
// Zmiana providera = nowa implementacja interface'u + jedna linia w factory.

import type { UIMessageInput } from "./types";

export interface ChatStreamOptions {
  systemPrompt: string;
  /** UI messages z @ai-sdk/react — provider konwertuje je do model messages. */
  messages: UIMessageInput[];
  model: string;
  temperature: number;
  /**
   * Narzędzia (tools) dla modelu. Format jest specyficzny dla aktualnego providera —
   * dlatego pole jest opaque (`unknown`). Definicje narzędzi mieszkają w
   * `src/lib/agent/tools/` i są dopasowane do bieżącego SDK. Przy zmianie providera
   * trzeba przepisać tools/* na nowy format, ale komponenty UI i route handler
   * importują je przez stabilny `agentTools` export.
   */
  tools?: Record<string, unknown>;
  abortSignal?: AbortSignal;
}

/**
 * Provider strumieniowo zwraca odpowiedź modelu jako standardowy Response
 * (Server-Sent Events / Data Stream Protocol). Klient (useChat z @ai-sdk/react)
 * konsumuje to bez świadomości tego, jaki SDK siedzi pod spodem.
 */
export interface ChatProvider {
  streamChat(opts: ChatStreamOptions): Promise<Response> | Response;
  /** Krótki, jednostrzałowy call do generowania tytułu rozmowy. */
  generateTitle(opts: {
    model: string;
    firstUserMessage: string;
    firstAssistantMessage: string;
  }): Promise<string>;
}
