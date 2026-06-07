// Factory providera. Cała reszta aplikacji woła `getChatProvider()`.
// Zmiana dostawcy LLM = podmień import poniżej.

import type { ChatProvider } from "./provider";
import { vercelOpenAiProvider } from "./providers/vercel-openai";

let cached: ChatProvider | null = null;

export function getChatProvider(): ChatProvider {
  if (!cached) cached = vercelOpenAiProvider;
  return cached;
}

export * from "./types";
export * from "./provider";
export { buildSystemPrompt } from "./prompt-builder";
export { PERSONAS, PERSONA_ORDER, getPersona } from "./personas";
export { agentTools, type AgentToolName } from "./tools/fetch-entry";
