# Icarus Diary

Icarus Diary is a local-first desktop diary backed by a plain `.ics` file. It
reads and writes `VEVENT` entries at a path you choose; no account, server, or
sync service is required. The Tauri capability configuration grants local file,
dialog, and settings-store access without network access.

Built with Tauri 2, Svelte 5, TypeScript, Vite, and Tailwind CSS.

## Capabilities

- Calendar month view with multiple entries per day, a Markdown editor and
  reader, locations, editing, deletion, and undo.
- Local fuzzy search across titles, locations, and entry bodies with
  `Ctrl/Cmd + K`.
- Native `.ics` open/import and backup export; the last opened file is restored
  on launch.
- Drafts and week-start preference persisted by the Tauri store.
- Atomic `.ics` writes, so a failed save does not replace the original file.

## Development

Requires Node.js, pnpm, Rust 1.77.2+, and the Linux WebKitGTK 4.1/GTK3
development libraries for Linux desktop builds.

```bash
pnpm install
pnpm tauri:dev       # desktop development with hot reload
pnpm dev             # frontend-only Vite server on port 1420
pnpm test            # Vitest unit tests
pnpm check           # svelte-check and TypeScript
pnpm tauri:build     # desktop bundle
```

The data mapping is implemented in [`src/lib/ical.ts`](src/lib/ical.ts), and
the native file operations are in [`src/lib/fs.ts`](src/lib/fs.ts).
