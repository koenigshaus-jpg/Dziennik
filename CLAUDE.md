# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal single-user journal PWA ("Dziennik"). Polish UI. Mobile-first with a desktop split-view (macOS Notes-style). Built with Next.js 16 (App Router), React 19, TypeScript, Tailwind 4, Tiptap, shadcn-style UI primitives, Drizzle ORM. See `PRD.md` for product goals.

## Commands

```bash
npm run dev      # Next dev server (port 3000)
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint (eslint-config-next)
```

There are no tests. Type errors surface at build time (`next build`). For UI verification use the Claude Preview MCP tools — `.claude/launch.json` is preconfigured as `"Next.js dev (Dziennik)"`.

## Architecture

### Persistence (Supabase)

Wpisy/tagi/media żyją w Supabase. **Aktywną warstwą danych jest [src/lib/db-supabase.ts](src/lib/db-supabase.ts)** — całe CRUD UI (`createEntry`/`updateEntry`/`deleteEntry`/`getEntry`/`listEntries` + zarządzanie tagami) idzie przez ten plik. Klient przeglądarkowy: [src/lib/supabase/client.ts](src/lib/supabase/client.ts) (`@supabase/ssr`, env `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Każde zapytanie jest RLS-owane per `user_id` zalogowanego użytkownika. Mutacje dispatchują `window` `CustomEvent("entries-changed", { detail: { id, kind } })`, na który nasłuchują inne panele (plus refetch na `window` `focus`).

- **Tabele**: `entries`, `tags`, `entry_tags`, `media`. Schema selecta w `ENTRY_SELECT` (db-supabase.ts).
- **Media w Storage**: bucket `media` (prywatny). Patrz sekcja „Media handling" niżej.
- **Embeddings / wyszukiwanie**: `entry_embeddings` + RPC hybrydowy (`supabase/migrations/`, `src/lib/api/embeddings.ts`, `src/lib/api/hybrid-search.ts`). Edge Function `supabase/functions/embed-entry`.

**Warstwy legacy (nieaktywne, nie używać w nowych feature'ach):**
- IndexedDB `src/lib/db-client.ts` — już NIE obsługuje wpisów. Zostaje tylko jako baza pod store `conversations` (Agent AI); jedyny importer to `src/lib/conversations-client.ts`. Wspólny opener IDB: [src/lib/idb.ts](src/lib/idb.ts) (`DB_NAME = "dziennik"`, `DB_VERSION = 2`) — dodając store podbij `DB_VERSION` i dorzuć guarded `createObjectStore`.
- Server/Drizzle: `src/lib/entries.ts` + `src/db/` + `src/app/api/entries/**` oraz `src/lib/storage.ts` — pozostałości po starym backendzie, nieexercise'owane przez UI.

### Agent AI

Wbudowany asystent rozmowny. Stack: `ai` (Vercel AI SDK) + `@ai-sdk/openai` + `@ai-sdk/react`.

**Kluczowa zasada**: cała komunikacja z LLM przechodzi przez interface `ChatProvider` w [src/lib/agent/provider.ts](src/lib/agent/provider.ts) — komponenty UI i route handlery NIGDY nie importują SDK dostawcy bezpośrednio. Zmiana providera (Anthropic / Gemini / surowy openai) = nowy plik w `src/lib/agent/providers/` + jedna linia w `getChatProvider()` w [src/lib/agent/index.ts](src/lib/agent/index.ts).

- **Persony** w [src/lib/agent/personas/](src/lib/agent/personas/): 7 person × 3–5 wariantów. Każda persona ma `defaultModel: gpt-4o-mini` i `deepModel: gpt-4o`. Toggle „deep mode" per persona w `/ustawienia`, stan w localStorage `agent.deepMode.<personaKey>`.
- **Persystencja rozmów**: object store `conversations` w `dziennik` IDB. Operacje przez [src/lib/conversations-client.ts](src/lib/conversations-client.ts), event `conversations-changed` (zgodnie z konwencją `entries-changed`). Hook [useConversationsMeta](src/lib/agent/use-conversations-meta.ts) agreguje meta po dniach (dla kalendarza, badge'y, listy historii).
- **Kontekst dnia**: niewidoczny w UI rozmowy. Klient buduje payload przez [src/lib/agent/entries-context.ts](src/lib/agent/entries-context.ts) — `dayEntries` (pełna treść wpisów z `day`) + `entriesIndex` (lekki indeks reszty: id + snippet + tagi). Indeks idzie do system promptu; model woła tool `fetchEntry(id)` (client-side execution via `onToolCall`) gdy chce pełną treść konkretnego wpisu.
- **UI**: [AgentSheet](src/components/agent/AgentSheet.tsx) — bottom-sheet mobile fullscreen / desktop centered. Globalny stan otwierania przez `useAgentSheet()` z [AgentSheetProvider](src/components/agent/AgentSheetProvider.tsx) zamontowanego w `layout.tsx`. `ComposerBar.handleSend` → `openSheet({day, initialMessage})`.
- **Auto-tytuł rozmowy**: osobny endpoint `/api/chat/title` (lekki `gpt-4o-mini`) wywoływany po 2. odpowiedzi assistant.
- **Markdown** w wiadomościach: własny minimalistyczny renderer [AgentMarkdown](src/components/agent/AgentMarkdown.tsx) (bez `react-markdown` — nie dodajemy 30 KB dla jednego use-case'a). Obsługuje listy, **bold**, *italic*, `code`, nagłówki, code blocks.

### Responsive layout system

Breakpoint that switches "mobile" vs "desktop" mode is Tailwind's `lg` (≥1024px). Components do not branch in JS — they render both variants and toggle via `lg:hidden` / `hidden lg:flex`.

- `AppShell` ([src/components/AppShell.tsx](src/components/AppShell.tsx)) wraps page content. Pass `wide` on pages that use the desktop split layout — it removes the `max-w-2xl` constraint on lg, removes vertical padding, and sets `lg:h-[calc(100dvh-3.5rem)] lg:overflow-hidden` so children can use a fixed-height split.
- `TopNav` ([src/components/TopNav.tsx](src/components/TopNav.tsx)) renders on lg only (`hidden lg:flex`, `h-14`).
- `BottomNav` ([src/components/BottomNav.tsx](src/components/BottomNav.tsx)) renders on mobile only (`lg:hidden`).
- `HistorySplit` ([src/components/history/HistorySplit.tsx](src/components/history/HistorySplit.tsx)) is the resizable two-pane layout (`lg:h-[calc(100dvh-3.5rem)]`). Width of the list pane persists in `localStorage` under `historyListWidth`, clamped 260–560px.

### Shared inline-edit pattern

`EntryEditor` ([src/components/entry/EntryEditor.tsx](src/components/entry/EntryEditor.tsx)) is the single editable view used by both the desktop preview pane ([HistoryPreviewPane](src/components/history/HistoryPreviewPane.tsx)) and the mobile entry page ([src/app/wpis/[id]/page.tsx](src/app/wpis/[id]/page.tsx)). It renders a header (date + delete dialog + Save button) plus `EntryForm` in `bare` mode.

`EntryForm` ([src/components/entry/EntryForm.tsx](src/components/entry/EntryForm.tsx)) is used in two shapes:
- `mode="create"` with the framed full layout (home page `/`).
- `mode="edit" bare` for inline editing (no frame, no bottom button row). It is `forwardRef<EntryFormHandle>` exposing `save()`, and reports `onDirtyChange` / `onSavingChange` so the parent can own the Save button.

Save UI differs by breakpoint inside `EntryEditor`: a small button in the top-right header on lg (`hidden lg:inline-flex`), a floating button at `fixed bottom-20 right-4` on mobile (`lg:hidden`). Both use the same `Button` (default variant).

### Routing

- `/` — new entry (`EntryForm mode="create"`). After successful create the redirect picks a target by viewport: desktop → `/historia?id=<newId>`, mobile → `/wpis/<newId>` (see `EntryForm.save`).
- `/historia` — list with filters (`q`, `tag`, `from`, `to`, `mood`) and selection (`id`). Mobile renders the list full-width; desktop renders `HistorySplit` with the same state. List entries link to `/wpis/[id]` on mobile, call `router.replace('/historia?id=…')` on desktop.
- `/wpis/[id]` — single entry editor (mobile primary). Desktop users typically stay in the split view.
- `/login`, `/api/login`, `/api/logout` — auth wiring exists but is currently disabled in [src/proxy.ts](src/proxy.ts) (`AUTH_ENABLED = false`). Re-enabling requires `SESSION_SECRET` and `APP_PASSWORD` env vars (see [src/lib/session-server.ts](src/lib/session-server.ts)).

### Design system

All primary CTA buttons go through `Button` ([src/components/ui/button.tsx](src/components/ui/button.tsx)) — radius (`rounded-md`), sizes (`sm`/`default`/`lg`/`icon`) and variants (`default`/`outline`/`ghost`/`destructive`) are defined there. Override `className` for layout/position, not for radius or color.

Conventions in non-`Button` markup:
- Chips/pills (filters, mood, tags, toolbar buttons in `EntryForm`): `rounded-full h-8`/`h-9`.
- Icon-only buttons (close, trash, filter toggle): `rounded-full` square.
- Container cards: `rounded-xl` / `rounded-2xl`.

### Media handling

Zdjęcia trafiają do **Supabase Storage** (bucket `media`, prywatny), nie do IndexedDB ani jako `data:` URI w bazie.

- **Upload**: kompresja klientowa w [src/lib/clientImage.ts](src/lib/clientImage.ts) → `data:` URI w stanie formularza → przy zapisie `persistMedia`/`uploadMediaItem` (w [src/lib/db-supabase.ts](src/lib/db-supabase.ts)) wgrywa blob do bucketu `media` pod kluczem `${userId}/${entryId}/${mediaId}.${ext}` i wstawia wiersz do tabeli `media`. Usunięcie zdjęcia → `deleteStorageKeys` + delete wiersza; `deleteEntry` sprząta wszystkie obiekty wpisu.
- **Odczyt**: `signMedia` zamienia `path` (storage key) na signed URL (TTL 1h) — `ClientMedia.path` w UI to signed URL.
- **Dodawanie zdjęć (punkty wejścia)**: mobile kalendarz — [PhotoFab](src/components/mobile/PhotoFab.tsx) (FAB obok mikrofonu: picker → kompresja → nowy wpis ze zdjęciami → `/wpis/[id]`); mobile widok wpisu — pill „Dodaj zdjęcie" po lewej od mikrofonu STT; desktop — pozycja „Dodaj zdjęcie" w menu „Dodaj element" ([EntryEditor.tsx](src/components/entry/EntryEditor.tsx)) + drag&drop na edytor. Logika dodawania (`handleImageFiles`, `openImagePicker`) siedzi w [EntryForm.tsx](src/components/entry/EntryForm.tsx).
- **Render**: miniatury zdjęć są pokazywane **nad** treścią wpisu (`MediaThumbs` nad `<Editor>` w EntryForm). Wpis może mieć samo zdjęcie, sam tekst albo oba.
- `MediaThumbs` ([src/components/entry/MediaThumbs.tsx](src/components/entry/MediaThumbs.tsx)) owns its lightbox state (index-based, keyboard `←`/`→`/`Esc`, prev/next arrows shown when >1 image, counter at bottom). Thumbnails use `object-contain` so non-square images aren't cropped.
- **Audio**: dodawanie/nagrywanie audio jest wyłączone (narazie). Mikrofon w edytorze to wyłącznie dyktowanie STT ([src/lib/useStt.ts](src/lib/useStt.ts), `renderMicButton` w EntryForm). Wyświetlanie istniejących nagrań (`AudioList`) zostaje dla starych wpisów, ale nie ma UI do nagrywania nowych.

## Conventions

- UI strings are Polish — match the existing tone when adding copy.
- Don't reintroduce `BottomNav` on lg or `TopNav` on mobile; the breakpoint split is intentional.
- When adding mutations, dispatch `entries-changed` so the list and preview panes refresh without a reload.
