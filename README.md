# Icarus Diary

A native, **local-first, air-gapped** diarying app. Your entries are stored as
standard `VEVENT` components in a plain `.ics` file that lives wherever you want —
outside this repo, on a USB stick, anywhere. No server, no account, no network.

Built with **Tauri v2 · Vite · TypeScript · Svelte 5 · Tailwind v4**.

---

## One-time setup

This is a desktop app, so it needs the Rust toolchain and the Linux WebView
system libraries. On a fresh machine (incl. WSL2 + WSLg) run:

```bash
# 1. System libraries (needs your sudo password)
sudo apt update && sudo apt install -y libwebkit2gtk-4.1-dev build-essential \
  curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev pkg-config

# 2. Rust (installs into ~/.cargo, no sudo)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
. "$HOME/.cargo/env"

# 3. JS dependencies + app icons
npm install
npm run icon          # generates app-icon.png and all platform icons
```

> Setup needs the network once. The finished app runs **fully offline**.

## Run

```bash
npm run tauri:dev     # dev build with hot reload
npm run tauri:build   # production bundle (AppImage / .deb)
```

The dev/build scripts set `WEBKIT_DISABLE_DMABUF_RENDERER=1` so the WebView
renders correctly under **WSLg** (otherwise the window may appear blank).

## Test

```bash
npm test              # vitest — iCal parse/serialize roundtrip
npm run check         # svelte-check + TypeScript
```

A `samples/sample-diary.ics` file is included for trying Import and search.

---

## How it works

- **Data** — one `.ics` file. `SUMMARY` → title, `DESCRIPTION` → Markdown body,
  `LOCATION` → subtitle, `DTSTART` → date. Multiple entries per day are fully
  supported.
- **Parsing** — `ical.js`, wrapped defensively in `src/lib/ical.ts`; a corrupt
  file shows a calm message and never loses in-memory data.
- **Saving** — atomic: write `file.ics.tmp`, then rename over the original, so a
  crash mid-write can't corrupt your diary (`src/lib/fs.ts`).
- **Search** — local fuzzy full-text via Fuse.js, focused with `Ctrl/Cmd + K`.
- **State** — Svelte 5 runes in `src/lib/store.svelte.ts`.

### Project layout

```
src/                     Svelte + TS frontend
  lib/                   models, ical, fs, config, search, markdown, store, date
  components/            Welcome, TopBar, Calendar, DayPane, WritingDock, …
src-tauri/               Rust shell (registers fs / dialog / store plugins)
  capabilities/          filesystem + dialog permission scope
```
