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

### Two parallel persistence paths

Persistence has been migrated from server to client. **Both layers exist in the codebase but the app currently reads/writes through the client IndexedDB layer.** Don't mix them in a single feature without intent.

- **Client (active)**: `src/lib/db-client.ts` — IndexedDB store named `dziennik`. All CRUD goes through `createEntry`/`updateEntry`/`deleteEntry`/`getEntry`/`listEntries`. Mutations dispatch a `window` `CustomEvent("entries-changed", { detail: { id, kind } })` which other panes listen to for live sync (also refetch on `window` `focus`).
- **Server (legacy)**: `src/lib/entries.ts` + `src/db/` (Drizzle + libsql) + `src/app/api/entries/**`. Still wired but not exercised by the UI. The DB backend resolves by env in `src/db/index.ts`: Turso → `/tmp` on Vercel (ephemeral) → local `./data/`. Server-side media storage in `src/lib/storage.ts` has three modes: Vercel Blob → data URI → local FS.

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

- Image compression happens client-side in `src/lib/clientImage.ts` before storing.
- Images and audio in client mode are stored as `data:` URIs inside the IndexedDB entry's `media[]`.
- `MediaThumbs` ([src/components/entry/MediaThumbs.tsx](src/components/entry/MediaThumbs.tsx)) owns its lightbox state (index-based, keyboard `←`/`→`/`Esc`, prev/next arrows shown when >1 image, counter at bottom). Thumbnails use `object-contain` so non-square images aren't cropped.

## Conventions

- UI strings are Polish — match the existing tone when adding copy.
- Don't reintroduce `BottomNav` on lg or `TopNav` on mobile; the breakpoint split is intentional.
- When adding mutations, dispatch `entries-changed` so the list and preview panes refresh without a reload.
