# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

Tauri v2 · Vite · TypeScript · Svelte 5 · Tailwind v4. The Rust shell is intentionally thin — it registers three official Tauri plugins (fs, dialog, store) and nothing else. All application logic lives in the TypeScript/Svelte frontend.

## Commands

```bash
pnpm tauri:dev          # dev build with hot reload (WSLg env vars baked in)
pnpm tauri:build        # production AppImage / .deb
pnpm dev                # Vite only — no Tauri, useful for pure UI work in browser
pnpm test               # vitest — unit tests for ical parsing and date helpers
pnpm test:watch         # vitest watch mode
pnpm check              # svelte-check + TypeScript
```

To run a single test file: `pnpm vitest run tests/ical.test.ts`

The `tauri:dev` and `tauri:build` scripts include `WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1` to prevent a blank WebView window under WSLg.

## Architecture

### State

A single `AppStore` class (exported as `app`) in `src/lib/store.svelte.ts` owns all reactive state via Svelte 5 runes. It handles loading, committing, drafts, navigation, and toasts. Components call methods on `app` directly — there's no separate action layer beyond `src/lib/actions.ts` (Tauri drag-drop helper).

### Data model

`DiaryEntry` maps 1:1 to a VEVENT:

| Field | iCal property |
|-------|--------------|
| `uid` | UID |
| `title` | SUMMARY |
| `content` (Markdown) | DESCRIPTION |
| `location` (optional subtitle) | LOCATION |
| `date` | DTSTART (date-only, VALUE=DATE) |

`StoredDraft` holds in-progress editor state persisted via `tauri-plugin-store` so drafts survive crashes. Multiple drafts can coexist.

### Key modules

- `src/lib/ical.ts` — parse/serialize between raw `.ics` text and `DiaryEntry[]`. Parsing is fully defensive: returns `ParseResult` (never throws).
- `src/lib/fs.ts` — atomic file writes: write `.tmp` then rename over original. All file I/O goes through here.
- `src/lib/config.ts` — persists the vault path via `tauri-plugin-store`.
- `src/lib/drafts.ts` — persists the draft list via `tauri-plugin-store`.
- `src/lib/search.ts` — Fuse.js full-text index, rebuilt on every vault load/commit.
- `src/lib/date.ts` — date helpers (`dateKey`, `keyToDate`, `startOfMonth`, `addMonths`).

### Tests

Only pure TS modules (ical, date helpers) are unit-tested in `tests/`. Vitest runs in Node environment with no Svelte/DOM setup. Tauri-dependent code (fs, config, drafts) is not unit-tested.

### Tailwind

Uses Tailwind v4's CSS-first approach — there is no `tailwind.config.js`. Configuration lives in `src/app.css`.

### Capabilities / permissions

`src-tauri/capabilities/default.json` scopes what the frontend can access. Filesystem access is intentionally broad (user picks arbitrary paths). No network permissions are declared anywhere — the app is air-gapped by design.
