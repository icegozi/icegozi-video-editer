# Project Memory

## Confirmed Architecture

- The app uses React 19, TypeScript, Vite, Remotion, Zod, and a Node-based FFmpeg pipeline.
- `src/editor` contains the browser editor. `src/video` and `src/app` contain Remotion compositions and scene registration.
- `src/domain` contains framework-independent models; `src/application` contains timeline, media, and render workflows; `src/infrastructure` contains filesystem and process adapters.
- Project definitions use `VideoProject` in `src/domain/video/VideoProject.ts` and runtime schemas in `src/schemas/project.schema.ts` (with unique ID validation across scenes, audio tracks, and subtitles).
- The timeline uses sequential scene layout by default; overlapping transitions (`crossfade`) adjust `currentStartFrame` backwards by `transition.durationInFrames` to render dual opacity envelopes without audio drift.
- Root composition (`src/app/Root.tsx`) dynamically computes canvas dimensions, fps, and duration via `calculateMetadata({ props })`.

## Persistence & Storage Rules

- `ProjectStorage` (`src/infrastructure/storage/ProjectStorage.ts`) persists projects in browser `localStorage` with Zod schema validation and monotonically increasing revision counters.
- Distinguishes same-tab out-of-order writes (gracefully ignored, retaining newer revision) from multi-tab conflicts (rejected when external storage advanced beyond tab's known revision).
- Server persistence (`src/infrastructure/db/projectDbService.ts`) implements Compare-And-Swap (CAS) via `expectedServerRevision` and idempotent saves (same content returns existing revision without counter bumps).
- `createRenderSnapshot` captures immutable timeline state without incrementing the edited project's `currentRevision` counter and reuses existing snapshot records to satisfy revision uniqueness.
- Full domain metadata (`schemaVersion`, `metadata`, `trackSettings`) roundtrips through SQLite snapshot tables.
- `useProjectPersistence` provides 800ms debounced autosave, manual save, reset to demo, and JSON export/import. Importing JSON marks workspace dirty for autosave; restoring persistence marks saved.
- Video scene split offset calculation: `secondHalf.startFromFrame = firstHalf.startFromFrame + Math.round(offsetInScene * playbackRate)`. Split keeps outgoing transition only on second half.

## Timeline & Track Semantics

- Dynamic minimum scene duration (`getMinSceneDuration(project, sceneId)`) strictly respects adjacent incoming and outgoing transition durations (`incoming + outgoing <= durationInFrames`).
- Unified track assignment helper (`getSceneTrackId`): text/formula belongs to V2 when primary media exists; falls back to V1 when only text/formula is present.
- Track settings (hidden, muted, locked) apply independently: V2 hidden does not affect V1; locked tracks are strictly enforced in editor reducer and proposal validators before state mutations.
- Cross-collection ID uniqueness enforced across scenes, audio tracks, and subtitles with descriptive error paths.

## Filesystem & Media Safety

- Source media in `public/assets` is strictly immutable.
- Uploads (`/api/assets/upload`) stream directly to exclusive temporary files (`.upload_${UUID}.tmp`, 256 MiB limit). Validates file magic bytes against extension, resolves storage key via UUID, and atomically promotes to storage. Original filenames are preserved purely as display metadata.
- JSON endpoints (`/api/projects`, `/api/render`) enforce a 1 MiB payload limit and concatenate raw Buffer chunks before UTF-8 decoding to preserve multi-byte Unicode strings (e.g. Vietnamese).
- `FileSystem.cleanDirectory` enforces a strict allowlist (`normalized`, `frames`, `previews`, `temp`) and verifies `fs.realpathSync` path containment to prevent symlink/junction escapes. Root, public, and output folders are protected.
- Intermediate media normalization fingerprints via SHA-256 (source path, file size, mtime, target width/height/fps) with atomic promotion (`fs.renameSync`) and in-flight request deduplication.
- File uploads and assets are resolved without double `assets/` prefix via `resolveAssetPath`.

## Render Service Architecture

- `renderApiPlugin` runs inside Vite dev server (`vite.config.ts`), exposing `/api/render`, `/api/render/status/:jobId`, `/api/render/cancel/:jobId`, `/api/render/download/:jobId`, and `/api/assets/upload`.
- Render profiles are strictly validated against enum values before any side effects (DB, snapshots, process spawn).
- ExportModal tracks client generation IDs (`renderGenerationRef`) to cancel in-flight jobs even if the server response has not arrived yet, and prevents stale polling loops from polluting new jobs.
- Render cancellation on Windows terminates child process trees cleanly and cleans up owned temporary props files.
- Jobs render headlessly via Remotion CLI (`src/index.ts MainVideo`) using props snapshot files in `generated/temp`.
- On Windows, child process spawning of `.cmd` files requires `shell: true` and strict quoting of arguments containing path spaces.

## Verification Commands

- `npm run typecheck`
- `npm test`
- `npm run build:editor`
- `npm run dev` starts the Vite editor on port 3200 (includes render API plugin).
- The dev launcher reuses a healthy existing editor only when its HTML project-root fingerprint matches this repository. Keep the fixed loopback host and `strictPort`; do not kill arbitrary port owners or silently move the assistant bridge to another port. Explicit `--port` overrides are supported.
- `npm run render:preview` and `npm run render` invoke the CLI render pipeline.

## User Corrections & Database Decisions

- 2026-10-10: User explicitly specified target platform is a local setup / build on Windows desktop.
- Database choice is SQLite (file-based embedded database) instead of PostgreSQL/client-server databases to eliminate external service setup on Windows.
- Data access: Drizzle ORM with `better-sqlite3`.
- Windows SQLite operational rules: Must configure WAL mode (`pragma journal_mode = WAL`), `pragma busy_timeout = 5000`, `pragma foreign_keys = ON`, `pragma synchronous = NORMAL`.

## Collaboration

- A request for a review and an implementation prompt authorizes review documents, not application changes.
- Preserve existing staged, unstaged, and untracked work. Do not create commits or alter branch history without an explicit request.

## Local ChatGPT/Codex Assistant

- The assistant uses SIWC and each user's own ChatGPT plan permission; never reuse `.env.local` API keys, Codex auth files or ChatGPT cookies as fallback.
- Browser project state is authoritative. AI changes use `APPLY_AI_PROJECT_CHANGE` with epoch/revision/SHA-256 checks and one undo entry; `LOAD_PROJECT` is not an AI edit.
- Credentials are encrypted with Windows current-user DPAPI outside the repository. The vendored official SIWC DevKit retains its Noncommercial License; business/hosted distribution needs separate evaluation.
- Codex 0.160.1 uses explicit empty machine environments and only app-owned namespace tools. Generated experimental schemas are checked in; actual native startup rejects `untrusted`, so the adapter uses `on-request` and declines machine approvals.
- Keep Code Mode and its native host enabled: current models can dispatch the video namespace through `exec`. Disabling `code_mode_host` makes inference finish without a draft. Ship and check the adjacent `codex-code-mode-host` binary alongside the pinned platform package.
- Windows portable releases include Node 24 (matching SQLite ABI), production dependencies and a built local backend. Static `dist` alone is insufficient. User-writable media/generated/output/SQLite files use `ICEGOZI_DATA_DIR` (default `%LOCALAPPDATA%/icegozi-video/workspace`); compositions and installed binaries stay under the application root. Never package credentials, `.env` files, local databases or assistant history.
- Wait for the owned process to close before restarting with rotated credentials; immediate respawn can race its SQLite files. Keep runtime homes separate per registration/conversation.
- Render CLI launches Node directly with an argument array, shell disabled and a filtered environment; codec/pixel format come from the render profile.
- 2026-10-10: User treats the app as a toolset for the LLM to make videos. Keep app-owned workflow skills under `skills/video`, ship them in releases, expose capability/schema discovery and trusted-ID skill reading, and validate candidates before proposal. Do not depend on personal Codex skills or unavailable external video tools.
- Code Mode dynamic tool results are JSON strings, not parsed objects; workflows manipulating project data must use `JSON.parse`. Tool definitions are in `editorTools.ts`; a contract hash refreshes stale native threads while preserving UI chat. Preview/final render tools still require user approval.
- Text scenes support `animationType: 'scale'` with bounded font size and endpoint scales. Pass the scene's own duration into `TextOverlay`; do not animate over the whole composition duration.

## UI/UX & AI Workspace Conventions

- The editor uses a light enterprise theme (`#F7F9FC` background, `#FFFFFF` surfaces, `#3568E8` brand blue) while preserving dark canvas interior (`#0F172A` / `#000000`) for video preview accuracy.
- Left workspace integrates tabbed navigation between `AI Studio` (default) and `Assets & Scenes`.
- CommandBar provides 3 workspace modes: `AI Focus` (default, collapses secondary panels for AI & canvas), `Edit Focus` (full multi-track timeline & inspector), and `Preview Focus` (maximizes canvas).
- PromptComposer enforces Vietnamese IME composition guards (`e.nativeEvent.isComposing || e.keyCode === 229`) to prevent premature submission during Telex/VNI candidate selection.
- Proposed AI modifications require human-in-the-loop approval via `ProposalCard` before applying through `APPLY_AI_PROJECT_CHANGE` with 1-click `Ctrl+Z` undo.
