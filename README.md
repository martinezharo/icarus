# Icarus Diary

Icarus Diary is a local-first diary backed by a plain `.ics` file. It reads and
writes `VEVENT` entries at a path you choose; no account, server, or sync
service is required. The Tauri capability configuration grants local file,
dialog, and settings-store access without network access.

The same frontend runs in a plain browser too: the app detects the runtime and
swaps the storage backend (`.ics` files on disk via Tauri, IndexedDB in the
browser) while keeping the `.ics` import/export flow identical.

Built with Tauri 2, Svelte 5, TypeScript, Vite, and Tailwind CSS.

## Capabilities

- Calendar month view with multiple entries per day, a Markdown editor and
  reader, locations, editing, deletion, and undo.
- Local fuzzy search across titles, locations, and entry bodies with
  `Ctrl/Cmd + K`.
- Native `.ics` open/import and backup export; the last opened file is restored
  on launch.
- Drafts and week-start preference persisted through the active backend.
- Atomic `.ics` writes on desktop, so a failed save does not replace the
  original file; browser vaults live in IndexedDB and export as `.ics`.

## Development

Requires Node.js, pnpm, Rust 1.77.2+, and the Linux WebKitGTK 4.1/GTK3
development libraries for Linux desktop builds.

```bash
pnpm install
pnpm tauri:dev       # desktop development with hot reload
pnpm dev             # browser mode on port 1420 (IndexedDB storage)
pnpm test            # Vitest unit tests
pnpm test:e2e        # browser-mode end-to-end tests (Playwright)
pnpm check           # svelte-check and TypeScript
pnpm tauri:build     # desktop bundle
```

The E2E suite drives the real UI in Chromium. It needs the browser once
(`pnpm exec playwright install chromium`) and serves the app itself. It runs
against a non-loopback HTTP origin on purpose — browsers only expose
secure-context APIs like `crypto.randomUUID` over HTTPS or localhost, and the
browser backend has to keep working on plain-HTTP LAN addresses. Set
`ICARUS_E2E_HOST` to choose the address the dev server should bind.

The data mapping is implemented in [`src/lib/ical.ts`](src/lib/ical.ts), and
the pluggable storage backends are in
[`src/lib/storage/`](src/lib/storage/).
