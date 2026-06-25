# Plan: la app es dueña del dato (vault interno) + red de seguridad

> Documento de planificación para retomar más tarde.
> Fecha: 2026-06-25

## Contexto y decisión

Hoy el diario vive en un archivo `.ics` **externo**, en una carpeta que elige el
usuario (modelo "vault" tipo Obsidian). El `filePath` recordado apunta ahí y la
app solo guarda esa ruta en `settings.json`. Ver `src/lib/fs.ts`,
`src/lib/config.ts`, `src/lib/store.svelte.ts`.

**Decisión tomada:** cambiar al modelo "la app es dueña del dato" (tipo Day One /
Apple Notes / Bear), porque el archivo externo separado genera ansiedad de "no lo
toques / no lo pierdas". El usuario quiere **importar** el `.ics`, que se guarde
en una carpeta interna de la app, y poder hacer lo que quiera con el `.ics`
original.

**Riesgo asumido conscientemente:** la app es air-gapped por diseño (sin sync en
la nube). Si la copia interna es la única, perder la carpeta de datos del SO
(reinstalación, perfil corrupto, fallo de disco) = perder el diario. Por eso se
añade red de seguridad.

**Modelo de respaldo elegido (respuesta del usuario):**
`Internos + auto-export visible` →
1. Copia interna en `appDataDir` = fuente de verdad.
2. Snapshots internos rotativos automáticos.
3. Auto-export periódico a una carpeta **visible que el usuario elige** (USB,
   Dropbox propio, etc.), opcional pero recomendado.

## Plan de implementación

### 1. Capabilities — `src-tauri/capabilities/default.json`
- Añadir scope para `$APPDATA` / `appDataDir` en: `fs:allow-read-text-file`,
  `fs:allow-write-text-file`, `fs:allow-rename`, `fs:allow-remove`,
  `fs:allow-exists`, y `fs:allow-mkdir` (crear `backups/`).
- Hoy el scope solo cubre `$HOME`, `/mnt`, `/media`, `/run/media`, `/tmp`. La
  carpeta de datos de la app NO está incluida.

### 2. Ubicaciones internas — `src/lib/config.ts` (o nuevo `src/lib/paths.ts`)
- `appDataDir/diary.ics` → fuente de verdad.
- `appDataDir/backups/diary-<timestamp>.ics` → snapshots rotativos.
- Persistir en `settings.json` la ruta de **auto-export** elegida (puede ser null).
- Usar `appDataDir()` del API de Tauri para resolver la base.

### 3. Flujo de datos — `src/lib/store.svelte.ts`
- `persist()`:
  1. Escribe atómico en la copia interna (`writeIcsAtomic`, ya existe y vale tal cual).
  2. Crea snapshot rotativo en `backups/`.
  3. Si hay carpeta de auto-export configurada, vuelca también ahí (atómico,
     best-effort: si falla NO debe romper el guardado principal, solo toast suave).
- "Abrir vault" → renombrar a **Importar**: copia el `.ics` elegido a la copia
  interna y esa pasa a ser la fuente. El `.ics` original queda intacto y el
  usuario hace lo que quiera con él.
- Arranque: si existe `diary.ics` interno → cargarlo directo, sin pedir archivo.
  Pantalla de bienvenida solo si no hay nada interno.
- `forgetVault` (hoy "olvida la ruta sin tocar el archivo") → cambia de
  semántica: ahora borraría dato REAL. Convertir en **"Borrar diario"** con
  confirmación explícita, o quitarlo del menú. Decisión: dejarlo con confirmación.
- `exportVault` (export manual puntual) → se mantiene tal cual.

### 4. UI mínima
- Ajustes:
  - Elegir / cambiar "carpeta de copia automática".
  - Botón "Restaurar copia" → lista de snapshots disponibles para restaurar.
  - Renombrar el botón destructivo (antes "olvidar vault") y añadir confirmación.

### 5. Migración (one-shot)
- Si al primer arranque hay un vault externo recordado (`icsPath` en
  `settings.json`), ofrecer importarlo a la copia interna una sola vez.

### 6. Tests — `tests/`
- Rotación de snapshots y resolución de rutas = TS puro → añadir tests.
- I/O de Tauri (fs/config/drafts) NO se testea, coherente con el repo actual.

## Decisiones abiertas (pendientes de confirmar al retomar)

- **Número de snapshots a conservar:** propuesto 8 (arbitrario; podría ser 10/20).
  "Rotación por fecha" = se conservan solo los N más recientes; al crear uno nuevo
  se borra el más antiguo (papelera rotativa, no un tope total histórico).
- **Granularidad de snapshots:** ¿uno por CADA guardado (muchos al día) o como
  mucho uno por día/sesión? Recomendación: **uno por día**, conservando más días
  (p. ej. 14), para tener histórico real con menos ruido.
- **Auto-export:** se pide la carpeta UNA vez y se recuerda. Si nunca se
  configura, no hay auto-export pero los snapshots internos siguen funcionando.
  ¿Cada cuánto se vuelca? (cada commit / al cerrar / periódico).
- **Privacidad:** ahora habrá copias dentro de la carpeta de la app. Documentarlo
  y quizá ofrecer "purgar backups". Posiblemente hacer el auto-export opt-in.

## Notas de arquitectura
- El núcleo de escritura atómica (`writeIcsAtomic` en `src/lib/fs.ts`: escribe
  `.tmp` y hace rename encima) ya sirve para todo lo anterior sin cambios.
- Mantener el diseño air-gapped: nada de esto introduce red.
