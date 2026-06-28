//! Icarus Diary — Tauri shell.
//!
//! All diarying logic lives in the TypeScript frontend; the Rust side only
//! registers the official plugins the app relies on (filesystem, native
//! dialogs, persistent settings store, and the system-opener used to launch
//! external links from diary entries in the user's default browser). The app
//! is fully local-first: no network access is requested or required.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running Icarus Diary");
}
