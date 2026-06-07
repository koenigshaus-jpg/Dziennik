// Wspólne typy warstwy agenta. Komponenty UI i route handlery odwołują się
// wyłącznie do tych typów — implementacje provider'ów (vercel-openai itd.)
// są podmienne bez zmian w reszcie kodu.

export type PersonaKey =
  | "advisor"
  | "therapist"
  | "philosopher"
  | "careerCoach"
  | "stoic"
  | "creative"
  | "productivity";

export interface PersonaVariant {
  /** Stabilny identyfikator wariantu (np. "epictetus", "value-investor"). */
  id: string;
  /** Wyświetlana nazwa (PL). W ustawieniach widoczna w liście. */
  name: string;
  /** Krótki opis (1 zdanie) widoczny pod nazwą w menu wyboru. */
  description: string;
  /** Fragment system promptu — opis tej konkretnej tradycji / podejścia. */
  systemPromptFragment: string;
  /** Opcjonalne ostrzeżenie pokazywane raz przy pierwszym wyborze. */
  warning?: string;
}

export interface PersonaConfig {
  key: PersonaKey;
  /** Nazwa wyświetlana (PL). */
  name: string;
  /** Krótki opis charakteru persony — widoczny w menu wyboru w sheet'cie. */
  description: string;
  /** Nazwa ikony z lucide-react (np. "LineChart"). */
  icon: string;
  /** Bazowy system prompt — wstęp wspólny dla wszystkich wariantów. */
  baseSystemPrompt: string;
  /** Temperature dla tej persony (taka sama dla każdego wariantu). */
  temperature: number;
  /** Default model OpenAI dla mini-trybu. */
  defaultModel: string;
  /** Model OpenAI dla trybu głębokiego (toggle w /ustawienia). */
  deepModel: string;
  /** Lista wariantów. Pierwszy jest default'em. */
  variants: PersonaVariant[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Lekki indeks wpisu wysyłany razem z requestem (id+snippet, bez pełnej treści). */
export interface EntryIndexItem {
  id: string;
  date: string; // YYYY-MM-DD
  title: string | null;
  snippet: string;
  mood?: string;
  tags?: string[];
}

/** Pełny wpis (treść) wysyłany dla aktualnego dnia. */
export interface EntryFull {
  id: string;
  title: string | null;
  plainText: string;
  mood?: string;
  tags?: string[];
}

export interface ChatRequestPayload {
  messages: ChatMessage[];
  personaKey: PersonaKey;
  personaVariant: string;
  /** Czy włączony tryb głęboki (gpt-4o zamiast mini). Wartość z localStorage. */
  deepMode: boolean;
  /** Dzień w którym znajduje się użytkownik (YYYY-MM-DD). */
  day: string;
  /** Pełne wpisy z `day` — zawsze w system prompcie. */
  dayEntries: EntryFull[];
  /** Lekki indeks WSZYSTKICH wpisów (poza tymi z dnia). */
  entriesIndex: EntryIndexItem[];
}

/** Payload dla endpointu generującego tytuł rozmowy. */
export interface ChatTitleRequestPayload {
  firstUserMessage: string;
  firstAssistantMessage: string;
}

export interface ChatTitleResponse {
  title: string;
}
