# PRD — Agent AI w Dzienniku

Wersja: 0.2 (MVP — decyzje zatwierdzone)
Status: gotowy do implementacji
Powiązane: [PRD.md](PRD.md), [CLAUDE.md](CLAUDE.md)

---

## 1. Cel produktu

Wbudowany w aplikację asystent rozmowny, do którego użytkownik zwraca się głosem lub pisemnie z dowolnego miejsca w aplikacji. Agent:

- **rozumie kontekst dnia** — wie, w którym dniu jest użytkownik, i automatycznie odczytuje wpisy z tego dnia, zanim zacznie myśleć;
- **sięga do reszty notatek** dopiero wtedy, gdy pytanie wykracza poza bieżący dzień (na MVP — przez lekki indeks wszystkich wpisów; pełny RAG na embeddingach w fazie następnej);
- **przyjmuje rolę profesjonalnego doradcy** wybranego z palety person (analityk biznesowy, psychoterapeuta, filozof, coach kariery, stoik, sparing kreatywny, mentor produktywności);
- **zachowuje historię rozmów** związaną z dniem, w którym się odbyła, i jest widoczna z trzech miejsc: karty wpisu, kalendarza i sekcji „Historia rozmów" w ustawieniach.

Charakter notatnika: codzienny asystent z lekkim biznesowo-zawodowym zabarwieniem. Modele i prompty dobierane pod refleksję, decyzje, planowanie i porządkowanie myśli — nie pod casual chat.

---

## 2. Zakres MVP / poza MVP

### W MVP

- Sheet rozmowy wysuwany z dołu nad istniejącym `ComposerBar` (działa na mobile i desktopie, dostępny z `/`, `/historia`, `/wpis/[id]`).
- Wybór persony przez ikonę menu po prawej stronie sheet'a (mała ikonka z chevronem).
- 7 person z 3–5 wariantami każda (patrz §5).
- Auto-kontekst: wpisy aktualnego dnia są dołączane do promptu „pod spodem", użytkownik tego nie widzi w UI rozmowy.
- Lekki indeks wszystkich wpisów (id, data, tytuł, snippet 150 znaków, tagi, nastrój) załączany do promptu — zamiast RAG-a.
- Tool `fetchEntry(id)` po stronie klienta, gdy model chce pełną treść konkretnego wpisu z indeksu.
- Persystencja rozmów w IndexedDB (osobny store `conversations`), przypisanie do dnia (`day: YYYY-MM-DD`).
- **Wiele rozmów per dzień per persona** — „Nowa rozmowa" w kebab menu sheet'a; powrót do persony w danym dniu otwiera ostatnią rozmowę.
- **Auto-generowany tytuł rozmowy** — po 2. odpowiedzi assistant taniutki call `gpt-4o-mini` generuje 3–5 słów (np. „Decyzja o zmianie pracy"); do tego czasu placeholder „Rozmowa z [persona]".
- **Tryb głęboki per persona** — toggle w `/ustawienia` per persona, podmienia default `gpt-4o-mini` → `gpt-4o`. Off domyślnie. Stanie się persistent w localStorage.
- **Modal ostrzegawczy dla wariantu „Brutalny redaktor"** — jednorazowy przy pierwszym wyborze, flaga `agent.brutal-warning-seen` w localStorage.
- Widoczność rozmów: badge persony na karcie wpisu w `/historia`, kropka w kalendarzu, sekcja „Historia rozmów" w ustawieniach.
- Dyktowanie: reuse istniejącego `useStt` (route `/api/transcribe` już działa, model `gpt-4o-mini-transcribe`).
- Streaming odpowiedzi tokeny-po-tokenach.
- Anulowanie odpowiedzi (przycisk stop).
- Ustawienia agenta jako nowa strona `/ustawienia` (potwierdzone — patrz §6.5).

### Poza MVP (kolejne iteracje)

- RAG na embeddingach (`text-embedding-3-small`, liczony przy każdym `createEntry`/`updateEntry`, przechowywany w IndexedDB obok wpisu).
- Tool calling do tworzenia / edycji wpisów przez agenta (na MVP agent tylko czyta).
- Edycja wysłanych wiadomości użytkownika z regeneracją odpowiedzi (na MVP wysłane = wysłane).
- Eksport rozmowy do PDF.
- Realtime API (voice-to-voice bez tekstu pośredniego).
- Telemetria kosztów tokenów per użytkownik / persona.
- Synchronizacja rozmów między urządzeniami (kiedy zrobisz sync wpisów).

---

## 3. User stories

| # | Jako… | chcę… | aby… |
|---|---|---|---|
| US-1 | użytkownik na wpisie z dziś | zapytać „co dziś było ważne?" w panelu na dole | dostać podsumowanie bez przepisywania wpisu do chatu |
| US-2 | użytkownik na `/historia` w dniu 12 marca | zapytać „jakie decyzje podjąłem tego dnia?" | agent czytał wpisy z 12 marca, nie z dziś |
| US-3 | użytkownik | zapytać „o czym ostatnio dużo pisałem o pracy?" | agent przeszukał wszystkie wpisy (indeks) i wskazał konkretne dni |
| US-4 | użytkownik refleksyjny | zmienić personę z analityka na stoika jednym kliknięciem | dostać tę samą sytuację z innej perspektywy bez wychodzenia z rozmowy |
| US-5 | użytkownik w ustawieniach | wybrać konkretny wariant filozofa (np. Nietzsche zamiast Sokrates) | rozmowa miała charakter tego myśliciela |
| US-6 | użytkownik | zobaczyć w kalendarzu, że 5 marca rozmawiał z coachem kariery | wrócić do tej rozmowy jednym kliknięciem |
| US-7 | użytkownik na desktopie | dyktować pytanie głosem, bo nie chce mu się pisać | rozmowa płynęła bez przerw |
| US-8 | użytkownik | mieć rozmowy zapisane lokalnie | nikt poza nim nie miał do nich dostępu (zgodnie z naturą PWA single-user) |

---

## 4. Flow UX

### 4.1 Wejście do rozmowy

1. Użytkownik wpisuje pytanie do `ComposerBar` (lub dyktuje mikrofonem).
2. Naciska „Wyślij" lub Enter.
3. Nad `ComposerBar` wysuwa się **sheet rozmowy** (animacja slide-up, 240ms, easing `ease-out`). Sheet zajmuje ~70% wysokości viewportu na mobile, na desktopie centruje się nad ComposerBarem do szerokości max 720px.
4. Pierwsza wiadomość użytkownika pokazuje się w sheet'cie, agent zaczyna streamować odpowiedź.
5. `ComposerBar` zostaje widoczny pod sheet'em do dalszych wiadomości.

### 4.2 Wybór persony

- Po prawej stronie sheet'a (header) mała ikonka z aktualną personą + chevron. Klik → dropdown z listą 7 person.
- Wybór persony w trakcie rozmowy: rozmowa **kontynuuje się**, ale system prompt się zmienia. Wiadomości pozostają, model w nowej roli kontynuuje wątek.
- Zmiana persony jest oznaczona w historii rozmowy małym divider'em („Zmiana persony → Stoik").

### 4.3 Zamykanie i wznowienie

- Sheet zamyka się: swipe-down na mobile, klik poza nim lub Esc na desktopie, X w prawym górnym rogu.
- Sheet po zamknięciu **nie czyści wątku**. Powrót do tego samego dnia + tej samej persony otwiera tę rozmowę. Inny dzień / inna persona → nowy wątek.
- Nowa rozmowa w obrębie dnia/persony: przycisk „Nowa rozmowa" w menu kebab (3 kropki) w headerze sheet'a.

### 4.4 Widoczność rozmów

- **Karta wpisu w `/historia` (mobile lista + desktop preview)**: pod tytułem rzędem ikon persony, z którymi prowadzono rozmowy tego dnia. Klik na ikonę → otwiera sheet z tą rozmową.
- **Kalendarz** (`CalendarSheet` mobile + `DesktopCalendarPopover`): dni z rozmowami dostają delikatną kropkę (inny kolor niż kropka wpisu — np. fioletowa/akcent, gdy wpis = neutral). Tap na dzień → poza listą wpisów pokazuje listę rozmów.
- **Ustawienia → Historia rozmów**: lista chronologiczna wszystkich rozmów z filtrami: po personie (multiselect chipy), po przedziale dat, fulltext po treści wiadomości. Każdy element to wiersz: data, ikona persony, pierwsze pytanie, liczba wiadomości.

### 4.5 Dyktowanie

- Reuse `useStt` z `ComposerBar`. Już działa, nic do zmiany w warstwie audio.

### 4.6 Stany błędu

- Brak `OPENAI_API_KEY`: toast „Asystent nie jest skonfigurowany" + log w konsoli.
- Brak sieci: toast „Brak połączenia. Pytanie zostanie wysłane po przywróceniu sieci" — wiadomość zostaje w stanie `queued` z ikoną zegara. Po odzyskaniu sieci automatyczny retry.
- Błąd modelu (5xx, 429): toast + retry button na ostatniej wiadomości użytkownika.
- Przerwanie streamingu przez użytkownika: częściowa odpowiedź zostaje, z badge „przerwane".

---

## 5. Persony

7 person, każda z 3–5 wariantami. Wybór persony — z headera sheet'a. Wybór wariantu — z ustawień (default = pierwszy wariant z listy). Każda persona ma:

- **Nazwę** (PL)
- **Ikonę** (lucide-react)
- **Krótki opis** (1 zdanie, widoczny w menu wyboru)
- **Tonę** (akademicka / pragmatyczna / empatyczna…) — wpływa na system prompt
- **Default model**: `gpt-4o-mini` (lub `gpt-5-mini` jeśli dostępny)
- **Temperature**: dostrojona per persona
- **System prompt template**: szkielet + slot na opis wariantu

### 5.1 Doradca biznesowy / analityk (`advisor`)

Ikona: `BriefChase` / `LineChart`. Tonacja: pragmatyczna, konkret. Temperature: 0.3.

Warianty (nazwiska ukryte, opisy fokusu):

1. **Inwestor wartościowy** — myślenie długoterminowe, margines bezpieczeństwa, koszt alternatywny, „nie kupuj tego, czego nie rozumiesz".
2. **Strateg operacyjny** — efektywność pracy umysłowej, struktura organizacji, decyzje na podstawie wyników, „co tu nie działa systemowo".
3. **Innowator wizjoner** — pierwsza zasada (first principles), obsesja na punkcie odbiorcy/klienta, kwestionowanie status quo.
4. **Racjonalista decyzyjny** — modele mentalne, inwersja problemu, lista checklistowa przed ważnymi decyzjami.
5. **Pragmatyk lean** — minimum viable, walidowane uczenie, eksperymenty zamiast planowania, „co najtaniej testuje hipotezę".

### 5.2 Psychoterapeuta (`therapist`)

Ikona: `HeartHandshake`. Tonacja: empatyczna, niedyrektywna, ostrożna. Temperature: 0.5.

**Ważne ograniczenie systemowe**: każda odpowiedź zawiera dyskretną notatkę przy pierwszym wejściu w temat kryzysowy (samobójstwo, krzywdzenie siebie/innych), że agent nie zastępuje profesjonalisty + numery wsparcia w PL (116 123 Telefon Zaufania, 800 70 2222 Centrum Wsparcia).

Warianty:

1. **Podejście poznawczo-behawioralne** — identyfikacja zniekształceń myślowych, zadawanie konkretnych pytań „co dokładnie pomyślałeś w tej chwili?", praca na schematach.
2. **Logoterapeutyczne** — pytanie o sens i wartości, „dla czego warto?", praca z odpowiedzialnością i wolnością wyboru.
3. **Analityczne (głębinowe)** — symbol, sen, cień, archetypy, pytania o nieoczywiste motywacje.
4. **Humanistyczne** — bezwarunkowa akceptacja, odbicie uczuć, dawanie przestrzeni; minimum rad, maksimum lustra.
5. **ACT (akceptacji i zaangażowania)** — defuzja od myśli, akceptacja trudnych emocji, działanie zgodne z wartościami pomimo dyskomfortu.

### 5.3 Filozof (`philosopher`)

Ikona: `BookOpen` / `Feather`. Tonacja: akademicka, lubi pytanie, nie odpowiedź. Temperature: 0.6.

Warianty (znane nazwiska, jasno wymienione):

1. **Sokrates** — metoda majeutyczna, prowadzi przez pytania, nie daje gotowych odpowiedzi, ironia.
2. **Friedrich Nietzsche** — wola mocy, krytyka moralności konwencjonalnej, amor fati, „stań się tym, kim jesteś".
3. **Søren Kierkegaard** — egzystencjalizm, lęk i wybór, skok wiary, jakość pojedynczego życia.
4. **Konfucjusz** — etyka relacji, role społeczne, ren (życzliwość), praktyka rytuałów codziennych jako fundament życia.
5. **Hannah Arendt** — działanie polityczne, banalność zła, vita activa vs vita contemplativa, odpowiedzialność za świat.

### 5.4 Coach kariery / mentor zawodowy (`careerCoach`)

Ikona: `Compass`. Tonacja: ciepło-konkretna, zadaje pytania ale i proponuje kroki. Temperature: 0.4.

Warianty:

1. **Mentor wzrostu** — mindset stały vs rozwojowy, „jeszcze nie potrafię" zamiast „nie potrafię", relacja z porażką.
2. **Architekt kariery** — myślenie strategiczne o ścieżce, sieć kontaktów jako infrastruktura, plan A/B/C.
3. **Coach granic i wartości** — gdzie kończą się twoje „tak"; bezpieczne mówienie „nie"; identyfikacja wypalenia.
4. **Strateg deep work** — kompetencje rzadkie i wartościowe, eliminacja płytkiej pracy, długie bloki bez przerw.
5. **Pragmatyk pivotu** — kiedy zmienić ścieżkę a kiedy zostać, metoda małych eksperymentów zawodowych.

### 5.5 Stoik (`stoic`)

Ikona: `Mountain` / `Pillar`. Tonacja: krótka, sucha, praktyczna. Temperature: 0.3.

Warianty (nazwiska):

1. **Marek Aureliusz** — cesarz piszący do siebie. Krótkie maksymy, pisanie jako ćwiczenie. Pytania o priorytety i śmierć jako perspektywa.
2. **Seneka** — listy do przyjaciela. Bardziej rozwlekły, oratorski. Praktyczne rady na konkretne sytuacje (gniew, lęk, czas).
3. **Epiktet** — niewolnik, który nauczał wolnych. Twarda dychotomia kontroli: co zależy ode mnie, co nie. Bez pobłażania.
4. **Katon Młodszy** — etyka twarda, niezłomność, zasady ponad wygodę. Mało kompromisów.
5. **Współczesny stoik praktyczny** — popularyzacja stoicyzmu we współczesnym kontekście pracy i decyzji. Mniej archaizmów, więcej ćwiczeń.

### 5.6 Sparing partner kreatywny / mentor pisania (`creative`)

Ikona: `Lightbulb` / `Sparkles`. Tonacja: prowokująca, życzliwa, lubi „a co jeśli". Temperature: 0.7.

Warianty:

1. **Eksperymentator iteracyjny** — szybkie prototypowanie pomysłu, „co najmniejsza wersja tego mogłaby wyglądać?", iteracja.
2. **Krytyk życzliwy (braintrust)** — bezpieczna, ale szczera krytyka. Wskazuje co nie działa, ale zawsze proponuje kierunek poprawy.
3. **Łącznik systemowy** — szuka połączeń między pomysłami z różnych wpisów, polimat, przekrojowe metafory.
4. **Brutalny redaktor** — bez ceregieli wytyka słabe miejsca pisania i myślenia. Cięcie zbędnych słów, surowa konkretność. **Wymaga jednorazowego potwierdzenia przy pierwszym wyborze** (modal: „Ten wariant jest celowo bezpardonowy w krytyce. Wybierając go, zgadzasz się na ostry feedback."); flaga `agent.brutal-warning-seen` w localStorage.
5. **Generator dywergentny** — 5 wariantów na każde pytanie, nieoczywiste perspektywy, „spróbuj odwrotnie".

### 5.7 Mentor produktywności / GTD (`productivity`)

Ikona: `ListChecks` / `Target`. Tonacja: rzeczowa, organizująca. Temperature: 0.3.

Warianty:

1. **Klasyczny GTD** — capture → clarify → organize → reflect → engage. Pyta „co jest następnym konkretnym krokiem?".
2. **Strateg Deep Work** — blokuje czas na głęboką pracę, identyfikuje płytkie zadania do delegacji/eliminacji.
3. **Time blocking architect** — projektuje tydzień jako siatkę bloków, każda godzina ma intencję.
4. **Eisenhower priorytetowy** — macierz pilne/ważne, eliminacja „pilnych ale nieważnych", agresywne odpuszczanie.
5. **Bullet journal minimalista** — dzienny log, migracja zadań, długa perspektywa miesiąca/roku zamiast jednego dnia.

---

## 6. Architektura techniczna

### 6.1 Stack

- **SDK LLM**: `ai` (Vercel AI SDK) + `@ai-sdk/openai`. Wybrany za: natywne wsparcie App Routera, streaming, hook `useChat`, łatwa wymiana providera (patrz §6.6).
- **Speech-to-text**: istniejące `/api/transcribe` + `useStt` — bez zmian.
- **Persystencja**: IndexedDB (database `dziennik`, nowy object store `conversations`).
- **Stan**: React state + custom events `conversations-changed` analogicznie do `entries-changed` (patrz CLAUDE.md).

### 6.2 Warstwa abstrakcji LLM (`src/lib/agent/`)

```
src/lib/agent/
├── provider.ts           # interface ChatProvider { streamChat(opts): AsyncIterable<TextChunk | ToolCall> }
├── providers/
│   ├── vercel-openai.ts  # implementacja używająca ai + @ai-sdk/openai (MVP)
│   └── (future)/         # gdy zmieniasz providera, dodajesz tu plik i wybierasz w factory
├── personas/
│   ├── index.ts          # rejestr person + funkcja getPersonaConfig(key, variant)
│   ├── advisor.ts
│   ├── therapist.ts
│   ├── philosopher.ts
│   ├── career-coach.ts
│   ├── stoic.ts
│   ├── creative.ts
│   └── productivity.ts
├── prompt-builder.ts     # składa system prompt z: persony + opis wariantu + dzisiejsze wpisy + indeks
├── tools/
│   └── fetch-entry.ts    # tool wykonywany client-side (czyta IndexedDB)
└── types.ts              # Persona, PersonaVariant, ConversationMessage, ChatRequestPayload
```

**Kluczowy kontrakt** — wszystko co dotyka LLM idzie przez `ChatProvider`. Komponenty UI i route handlery NIE importują `@ai-sdk/openai` bezpośrednio. Zmiana providera = nowa implementacja, jedna linia w factory.

### 6.3 Przepływ pojedynczej wiadomości

```
┌─────────────┐                     ┌──────────────────┐                ┌─────────────────┐
│  Sheet UI   │                     │ /api/chat        │                │ ChatProvider    │
│ (useChat)   │                     │ Route Handler    │                │ (vercel-openai) │
└─────┬───────┘                     └────────┬─────────┘                └────────┬────────┘
      │                                      │                                   │
      │ POST { messages, personaKey,         │                                   │
      │       personaVariant, day,           │                                   │
      │       dayEntries, entriesIndex }     │                                   │
      ├─────────────────────────────────────►│                                   │
      │                                      │ buildSystemPrompt(...)            │
      │                                      ├──────────────────────────────────►│
      │                                      │                                   │
      │                                      │                    streamText(... openai("gpt-4o-mini"))
      │                                      │◄──────────────────────────────────┤
      │ ◄── streaming tokens ──              │ ◄── streaming tokens ──           │
      │                                      │                                   │
      │ on tool call (fetchEntry id=X):      │                                   │
      │   read IndexedDB locally,            │                                   │
      │   send tool result back              │                                   │
      │ ◄─ (kontynuacja stream'a) ─          │                                   │
```

### 6.4 Co klient dosyła w request body

```ts
type ChatRequestPayload = {
  messages: { role: 'user' | 'assistant'; content: string }[];
  personaKey: PersonaKey;            // np. 'stoic'
  personaVariant: string;            // np. 'epictetus'
  deepMode: boolean;                 // czytane z localStorage `agent.deepMode.<personaKey>`
  day: string;                       // YYYY-MM-DD — dzień w którym user się znajduje
  dayEntries: {
    id: string;
    title: string | null;
    plainText: string;               // tiptap → text
    mood?: string;
    tags?: string[];
  }[];
  entriesIndex: {
    id: string;
    date: string;                    // YYYY-MM-DD
    title: string | null;
    snippet: string;                 // pierwsze 150 znaków plainText
    mood?: string;
    tags?: string[];
  }[];
};
```

**Uzasadnienie**:
- `dayEntries` — pełna treść wpisów z dnia idzie ZAWSZE w system prompt. Agent nie musi „prosić" o kontekst dnia, ma go.
- `entriesIndex` — lekki indeks WSZYSTKICH innych wpisów (id + snippet + tagi). Załączany w system prompt jako sekcja „Twoje pozostałe notatki (skrócony indeks)". Model sam decyduje, czy/co pociągnąć przez tool.
- Tool `fetchEntry(id)` — gdy model chce pełną treść konkretnego wpisu z indeksu. Wykonywany client-side (Vercel AI SDK: `useChat` z `onToolCall` zwracającym wynik), bo dane są w IndexedDB.

### 6.5 Wbudowanie w istniejący UI

- `ComposerBar` (`src/components/mobile/ComposerBar.tsx`) — `handleSend` przestaje być TODO, otwiera nowy komponent `AgentSheet`.
- `AgentSheet` (`src/components/agent/AgentSheet.tsx`) — nowy:
  - Renderuje listę wiadomości (user/assistant bubble) + streamujący kursor.
  - Header z personą + kebab menu.
  - Footer ze stop-streaming + status (myśli, pisze, błąd).
  - Podpięty przez Context (`AgentSheetProvider`) — `ComposerBar` woła `openAgentSheet({ initialMessage, day })`.
  - Mobile: fullscreen sheet z nakładką, `ComposerBar` widoczny pod nim (pinned).
  - Desktop: centered modal-sheet 720px szerokości nad ComposerBarem, z backdrop.
- Nowy widok `/ustawienia`:
  - Sekcja „Asystent AI" — wybór wariantu per persona, default persona, opcjonalnie override modelu per persona.
  - Sekcja „Historia rozmów" — lista z filtrami.
- `BottomNav` + `TopNav` — bez zmian (rozmowy nie dostają własnej zakładki; agent jest „pod ręką" z każdej strony).

### 6.6 Plan wymiany providera

Cała komunikacja z LLM przechodzi przez `ChatProvider` interface zdefiniowany w `src/lib/agent/provider.ts`:

```ts
export interface ChatProvider {
  streamChat(opts: {
    systemPrompt: string;
    messages: ChatMessage[];
    tools?: Record<string, ToolDefinition>;
    temperature: number;
    model: string;
    abortSignal?: AbortSignal;
  }): AsyncIterable<ChatStreamChunk>;
}
```

`/api/chat/route.ts` używa `getProvider()` z `src/lib/agent/index.ts`. Aby zmienić provider (np. na Anthropic Claude, Google Gemini, lub bezpośredni `openai` SDK):

1. Dodaj plik `src/lib/agent/providers/anthropic.ts` implementujący `ChatProvider`.
2. Zmień jedną linię w `getProvider()`.
3. Definicje person, prompty, tools, UI — bez zmian.

Modele wskazujemy stringiem, więc upgrade z `gpt-4o-mini` na `gpt-5-mini` lub na inny model = zmiana konfigu, nie kodu.

### 6.7 Storage rozmów (IndexedDB)

Nowy object store `conversations` w istniejącej bazie `dziennik`:

```ts
type Conversation = {
  id: string;              // uuid
  day: string;             // YYYY-MM-DD — dzień przypisania
  personaKey: PersonaKey;
  personaVariant: string;
  title: string | null;    // null do czasu auto-generacji po 2. odpowiedzi assistant
  createdAt: number;
  updatedAt: number;
  messages: ConversationMessage[];
};

type ConversationMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  status?: 'ok' | 'queued' | 'error' | 'aborted';
  toolCalls?: { name: string; args: unknown; result?: unknown }[];
};
```

Operacje w `src/lib/conversations-client.ts` (mirror `db-client.ts`): `createConversation`, `appendMessage`, `setTitle`, `listConversations`, `listConversationsByDay`, `listConversationsByDayAndPersona`, `deleteConversation`. Każda mutacja dispatchuje `window` `CustomEvent('conversations-changed')`.

**Auto-generacja tytułu**: po zapisaniu 2. wiadomości assistant w danej rozmowie, `AgentSheet` wywołuje `/api/chat/title` (osobny lekki endpoint) z payload `{ firstUserMessage, firstAssistantMessage }`. Model `gpt-4o-mini`, temperature 0.3, system prompt: „Wygeneruj zwięzły 3-5 słowny tytuł rozmowy po polsku. Zwróć tylko tytuł, bez cudzysłowów.". Wynik zapisuje przez `setTitle(id, title)`. Do czasu wygenerowania UI pokazuje placeholder „Rozmowa z [persona]".

### 6.8 Modele i koszty

| Persona | Default model | Deep model | Temperature | Uzasadnienie |
|---|---|---|---|---|
| Doradca | `gpt-4o-mini` | `gpt-4o` | 0.3 | Konkretne odpowiedzi, niski koszt; deep mode dla strategicznych decyzji. |
| Psychoterapeuta | `gpt-4o-mini` | `gpt-4o` | 0.5 | Wrażliwy temat, mini wystarcza; deep mode dla trudniejszych rozmów. |
| Filozof | `gpt-4o-mini` | `gpt-4o` | 0.6 | Wymaga głębi — najczęstszy kandydat do włączenia deep mode. |
| Coach kariery | `gpt-4o-mini` | `gpt-4o` | 0.4 | Pragmatyka + ciepło. |
| Stoik | `gpt-4o-mini` | `gpt-4o` | 0.3 | Krótkie, suche odpowiedzi — mini wystarcza z naddatkiem. |
| Kreatywny | `gpt-4o-mini` | `gpt-4o` | 0.7 | Dywergencja — wyższa temperatura ważniejsza niż większy model. |
| Produktywność | `gpt-4o-mini` | `gpt-4o` | 0.3 | Strukturyzowane odpowiedzi. |

**Tryb głęboki (deep mode)**: per persona toggle w `/ustawienia` → „Asystent AI" → karta każdej persony ma switch „Tryb głęboki (gpt-4o, ~15× droższy)". Stan w localStorage pod kluczem `agent.deepMode.<personaKey>` (boolean). Klient odczytuje przed wysłaniem requestu i wstawia odpowiedni model do `ChatRequestPayload`. Domyślnie OFF dla wszystkich.

Strategia oszczędzania tokenów:

1. **System prompt cacheable** — układ stały, dłuższy → automatyczny prompt caching OpenAI (-50%).
2. **Indeks zamiast pełnych wpisów** — ~50 znaków na wpis w indeksie zamiast całego tekstu.
3. **Limit historii rozmowy** — model dostaje ostatnie 20 wiadomości; starsze sumaryzujemy do `summary` polu rozmowy po przekroczeniu (poza MVP, jeśli problem).
4. **Streaming + abort** — użytkownik może przerwać, nie płaci za resztę.
5. **Tool zamiast pre-load** — pełne treści innych wpisów tylko gdy model rzeczywiście potrzebuje.

Szacunek dla typowej rozmowy (10 wpisów w dniu, 50 w indeksie, 5 wymian):

- System prompt persony: ~600 tokenów.
- Dzisiejsze wpisy: ~1500 tokenów.
- Indeks 50 wpisów × 50 tokenów ≈ 2500 tokenów.
- Historia 5 wymian: ~1500 tokenów.
- **Wejście ~6100 tokenów × `gpt-4o-mini` ($0.15/1M) = ~$0.001 per wymiana** (po cache ~$0.0005).
- Odpowiedź ~400 tokenów × $0.60/1M = ~$0.00024.
- **Całość rozmowy 5 wymian: ~$0.006 (≈3 gr)**.

---

## 7. Bezpieczeństwo i prywatność

- Klucz `OPENAI_API_KEY` zostaje wyłącznie po stronie serwera (już tak jest w `/api/transcribe`).
- Rozmowy w IndexedDB nie opuszczają urządzenia (poza tym co leci do OpenAI w trakcie zapytania).
- Brak telemetrii rozmów po stronie aplikacji.
- Persona psychoterapeuty: każda nowa rozmowa zaczyna się od dyskretnego footer-disclaimera „Nie zastępuję profesjonalnej pomocy. Telefon zaufania: 116 123." w pierwszej wiadomości assistant. System prompt zawiera regułę: jeśli wykryje sygnały kryzysu (myśli samobójcze, zamiar krzywdy), na początku odpowiedzi umieszcza krótki numer wsparcia.
- `/api/chat` nie loguje treści rozmów; loguje tylko status + error.

---

## 8. Plan implementacji (etapy)

### Etap 1 — Backbone (1 sesja, ~30–45 min)

- [ ] `npm i ai @ai-sdk/openai`
- [ ] `src/lib/agent/types.ts`, `provider.ts`, `providers/vercel-openai.ts`
- [ ] `src/lib/agent/personas/*.ts` — 7 person × 3–5 wariantów (system prompt szablon)
- [ ] `src/lib/agent/prompt-builder.ts`
- [ ] `src/app/api/chat/route.ts` — streaming endpoint
- [ ] Health check: surowy fetch z testowym payloadem

### Etap 2 — Storage rozmów

- [ ] `src/lib/conversations-client.ts` (IndexedDB) — CRUD + `setTitle`
- [ ] Event `conversations-changed`
- [ ] Hook `useConversationsByDay(day)`, `useConversation(id)`, `useConversationsByDayAndPersona(day, personaKey)`
- [ ] `src/app/api/chat/title/route.ts` — endpoint generujący tytuł rozmowy

### Etap 3 — UI rozmowy

- [ ] `AgentSheet` (mobile + desktop), `AgentSheetProvider` (context)
- [ ] Integracja z `ComposerBar` — `handleSend` otwiera sheet i wysyła pierwszą wiadomość
- [ ] Streaming UI (`useChat` z `@ai-sdk/react`), tool execution `fetchEntry` client-side
- [ ] Kebab menu: zmiana persony w trakcie rozmowy, nowa rozmowa, usuń rozmowę
- [ ] Stany: queued / sending / streaming / aborted / error
- [ ] Trigger auto-tytułu po 2. odpowiedzi assistant (wywołanie `/api/chat/title`)
- [ ] Modal ostrzegawczy przy pierwszym wyborze wariantu „Brutalny redaktor" (flaga `agent.brutal-warning-seen`)

### Etap 4 — Widoczność rozmów + ustawienia

- [ ] Badge persony na karcie wpisu w `/historia` (mobile lista + desktop preview)
- [ ] Kropka w kalendarzu (mobile `CalendarSheet` + desktop `DesktopCalendarPopover`)
- [ ] Nowa strona `/ustawienia` + link w `BottomNav` (mobile) i `TopNav` (desktop)
- [ ] Sekcja „Asystent AI" — wybór wariantów per persona, default persona, toggle „Tryb głęboki" per persona
- [ ] Sekcja „Historia rozmów" — lista chronologiczna z filtrami (multiselect persony, zakres dat, fulltext)

### Etap 5 — Polish

- [ ] Empty states, animacje slide
- [ ] Skróty: Esc zamyka sheet, ⌘K nowa rozmowa
- [ ] Test ręczny każdej persony × każdy wariant
- [ ] Update `CLAUDE.md` o nowy moduł

### Etap 6 (poza MVP) — RAG

- [ ] `text-embedding-3-small` przy create/update entry
- [ ] Cosine search w IndexedDB
- [ ] Indeks zastąpiony top-5 najbliższych wpisów do pytania

---

## 9. Zatwierdzone decyzje

| # | Pytanie | Decyzja |
|---|---|---|
| 1 | Tryb głęboki (gpt-4o-mini → gpt-4o) | **Tak, w MVP** — toggle per persona w `/ustawienia`, stan w localStorage `agent.deepMode.<personaKey>`, default OFF. |
| 2 | Tytuł rozmowy | **Auto-generowany** po 2. odpowiedzi assistant, osobny endpoint `/api/chat/title`, model `gpt-4o-mini`. Do tego czasu placeholder „Rozmowa z [persona]". |
| 3 | Wiele rozmów per persona per dzień | **Tak** — „Nowa rozmowa" w kebabie sheet'a. Powrót do persony w danym dniu otwiera ostatnią rozmowę. |
| 4 | Edycja wysłanych wiadomości | **Nie w MVP**. Przeniesione do „Poza MVP". |
| 5 | Ostrzeżenie dla „Brutalnego redaktora" | **Tak, jednorazowy modal** przy pierwszym wyborze, flaga `agent.brutal-warning-seen` w localStorage. |
| 6 | Lokalizacja ustawień agenta | **Nowa route `/ustawienia`** + link w `BottomNav` (mobile) i `TopNav` (desktop). |

---

## 10. Definicje sukcesu

- Użytkownik (Ty) prowadzi co najmniej 1 rozmowę dziennie przez tydzień bez frustracji UX.
- Czas od `tap mic` do pierwszego tokenu odpowiedzi < 2.5s na sieci 4G.
- Koszt 1 dnia użycia (10 wymian) < 0.10 zł na `gpt-4o-mini`.
- Zmiana persony w trakcie rozmowy nie wymaga przewijania / zamykania sheet'a.
- Wymiana providera (gdyby trzeba) = max 1 plik + 1 linia w factory.
