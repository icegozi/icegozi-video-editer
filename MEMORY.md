# Project Memory

## Confirmed Architecture

- The app uses React 19, TypeScript, Vite, Remotion, Zod, and a Node-based FFmpeg pipeline.
- `src/editor` contains the browser editor. `src/video` and `src/app` contain Remotion compositions and scene registration.
- `src/domain` contains framework-independent models; `src/application` contains timeline, media, and render workflows; `src/infrastructure` contains filesystem and process adapters.
- Project definitions use `VideoProject` in `src/domain/video/VideoProject.ts` and runtime schemas in `src/schemas/project.schema.ts` (with unique ID validation across scenes, audio tracks, and subtitles).
- The timeline uses sequential scene layout by default; overlapping transitions (`crossfade`) adjust `currentStartFrame` backwards by `transition.durationInFrames` to render dual opacity envelopes without audio drift.
- Root composition (`src/app/Root.tsx`) dynamically computes canvas dimensions, fps, and duration via `calculateMetadata({ props })`.

## Persistence & Storage Rules

- `ProjectStorage` (`src/infrastructure/storage/ProjectStorage.ts`) persists projects in browser `localStorage` with Zod schema validation and monotonically increasing revision counters to guard against out-of-order writes.
- `useProjectPersistence` provides 800ms debounced autosave, manual save, reset to demo, and JSON export/import.
- Video scene split offset calculation: `secondHalf.startFromFrame = firstHalf.startFromFrame + Math.round(offsetInScene * playbackRate)`.

## Filesystem & Media Safety

- Source media in `public/assets` is strictly immutable.
- `FileSystem.cleanDirectory` enforces a strict allowlist (`normalized`, `frames`, `previews`, `temp`) and verifies `fs.realpathSync` path containment to prevent symlink/junction escapes. Root, public, and output folders are protected.
- Intermediate media normalization fingerprints via SHA-256 (source path, file size, mtime, target width/height/fps) with atomic promotion (`fs.renameSync`) and in-flight request deduplication.
- File uploads and assets are resolved without double `assets/` prefix via `resolveAssetPath`.

## Render Service Architecture

- `renderApiPlugin` runs inside Vite dev server (`vite.config.ts`), exposing `/api/render`, `/api/render/status/:jobId`, `/api/render/cancel/:jobId`, `/api/render/download/:jobId`, and `/api/assets/upload`.
- Jobs render headlessly via Remotion CLI (`src/index.ts MainVideo`) using props snapshot files in `generated/temp`.
- On Windows, child process spawning of `.cmd` files requires `shell: true` and strict quoting of arguments containing path spaces.

## Verification Commands

- `npm run typecheck`
- `npm test`
- `npm run build:editor`
- `npm run dev` starts the Vite editor on port 3200 (includes render API plugin).
- `npm run render:preview` and `npm run render` invoke the CLI render pipeline.

## Collaboration

- A request for a review and an implementation prompt authorizes review documents, not application changes.
- Preserve existing staged, unstaged, and untracked work. Do not create commits or alter branch history without an explicit request.
