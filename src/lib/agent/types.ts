// Wspólne typy warstwy agenta. Komponenty UI i route handlery odwołują się
// wyłącznie do tych typów — implementacje provider'ów (vercel-openai itd.)
// są podmienne bez zmian w reszcie kodu.

export type PersonaKey =
  | "advisor"
  | "therapist"
  | "philosopher"
  | "careerCoach"
  | "creative"
  | "productivity";

export interface PersonaConfig {
  key: PersonaKey;
  /** Nazwa wyświetlana (PL). */
  name: string;
  /** Krótki opis charakteru persony — widoczny w menu wyboru. */
  description: string;
  /** Nazwa ikony z lucide-react (np. "LineChart"). */
  icon: string;
  /** System prompt persony. */
  systemPrompt: string;
  /** Temperature dla tej persony. */
  temperature: number;
  /** Default model OpenAI dla mini-trybu. */
  defaultModel: string;
  /** Model OpenAI dla trybu głębokiego (toggle w /ustawienia). */
  deepModel: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Pełny wpis (treść) wysyłany w kontekście agenta. */
export interface EntryFull {
  id: string;
  /** Data wpisu YYYY-MM-DD — obecna w wpisach spoza bieżącego dnia. */
  date?: string;
  title: string | null;
  plainText: string;
  mood?: string;
  tags?: string[];
}

export interface ChatRequestPayload {
  messages: ChatMessage[];
  personaKey: PersonaKey;
  /** Czy włączony tryb głęboki (gpt-4o zamiast mini). Wartość z localStorage. */
  deepMode: boolean;
  /** Dzień w którym znajduje się użytkownik (YYYY-MM-DD). */
  day: string;
  /** Pełne wpisy z `day` — zawsze w system prompcie. */
  dayEntries: EntryFull[];
  /** Pełne wpisy ze wszystkich pozostałych dni (z wypełnionym polem date). */
  otherEntries: EntryFull[];
}

/** Payload dla endpointu generującego tytuł rozmowy. */
export interface ChatTitleRequestPayload {
  firstUserMessage: string;
  firstAssistantMessage: string;
}

export interface ChatTitleResponse {
  title: string;
}
