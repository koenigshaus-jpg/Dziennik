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

/** UI message przekazywane z klienta (z @ai-sdk/react). Serwer konwertuje
 *  je na model messages przez `convertToModelMessages`, dzięki czemu tool
 *  calls + outputs nie giną w transporcie. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UIMessageInput = any;

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

/** Lekka pozycja indeksu wpisów spoza bieżącego dnia. Pełną treść model dociąga przez fetchEntry. */
export interface EntryIndexItem {
  id: string;
  /** Data wpisu YYYY-MM-DD. */
  date: string;
  title: string | null;
  /** Krótki fragment treści (do ~200 znaków). */
  snippet: string;
  mood?: string;
  tags?: string[];
}

export interface ChatRequestPayload {
  messages: UIMessageInput[];
  personaKey: PersonaKey;
  /** Czy włączony tryb głęboki (gpt-4o zamiast mini). Wartość z localStorage. */
  deepMode: boolean;
  /** Dzień w którym znajduje się użytkownik (YYYY-MM-DD). */
  day: string;
  /** Pełne wpisy z `day` — zawsze w system prompcie. */
  dayEntries: EntryFull[];
  /** Lekki indeks wpisów ze wszystkich pozostałych dni — model pobiera pełną treść przez fetchEntry. */
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
