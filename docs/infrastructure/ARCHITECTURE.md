# ICEGOZI Video Architecture

ICEGOZI Video is a local-first Windows video editor built with React, Vite,
Remotion, TypeScript, SQLite/Drizzle and FFmpeg. The repository uses a pragmatic
hybrid architecture: feature-oriented presentation and application modules sit
on top of a small domain layer, while operating-system and provider integrations
live in infrastructure.

## Dependency direction

```text
editor (browser UI) ───────┐
app/video (Remotion UI) ───┼──> application ───> domain
server composition root ───┘          │
             │                         └── ports/contracts
             └──> infrastructure ─────────> external runtimes and storage
```

- `src/domain` owns framework-independent video models and timeline rules. It
  must not import editor, server, filesystem or provider code.
- `src/application` owns use cases, validation and contracts. Infrastructure
  implementations are supplied at composition roots. Existing CLI-oriented
  media/render workflows remain pragmatic orchestrators over infrastructure.
- `src/infrastructure` owns SQLite, filesystem, FFmpeg/FFprobe, Codex, Google,
  rendering and HTTP adapters.
- `src/editor` owns browser state, persistence and UI. It calls local HTTP
  contracts and application commands; it does not instantiate server adapters.
- `src/app` and `src/video` own deterministic Remotion registration and frame
  rendering. Composition IDs and the `src/index.ts` entry point are stable.

## Source ownership

| Directory | Responsibility |
| --- | --- |
| `src/application/assistant` | Assistant use cases, project proposals, tool contracts and bounded snapshot validation |
| `src/application/scene-generation` | Generation plans/jobs contracts, provider port, repository/asset-store ports and orchestration |
| `src/application/timeline` | Pure timeline calculations and editor project commands |
| `src/editor/components/assistant` | Assistant presentation, approvals, proposals and prompt composition |
| `src/editor/components/scene-generation` | Scene-generation controls and connection dialogs |
| `src/editor/persistence` | Browser `localStorage` adapter and revision handling |
| `src/infrastructure/db` | Drizzle schema, migrations and SQLite services |
| `src/infrastructure/media` | Generated-media inspection, validation and safe ingest adapter |
| `src/infrastructure/render` | Headless Remotion job execution and lifecycle |
| `src/infrastructure/scene-generation` | SQLite repository and Google/CoreScene provider adapters |
| `src/infrastructure/server` | Local-only HTTP transport and dependency composition |
| `src/video/compositions` | `MainVideo` and generated vector-scene Remotion implementations |
| `src/generation/index.tsx` | Stable generated-scene CLI/renderer entry wrapper |

## Main runtime flows

### Editor mutation

```text
UI event -> editorStore history/reconciliation -> application/timeline projectCommands
         -> validated VideoProject -> browser persistence / render snapshot
```

Project mutations remain pure in `projectCommands.ts`. The editor store owns UI
selection, undo/redo, assistant acknowledgements and persistence coordination.

### Assistant and scene generation

```text
AI Studio -> local Codex API -> AssistantService -> SceneGenerationService
                                      │                    │
                                      │                    ├─ provider port
                                      │                    ├─ repository port
                                      │                    └─ generated asset-store port
                                      └─ reviewed proposal -> editor reducer
```

Provider and repository implementations are injected by `codexApiPlugin.ts`.
Plans and generated assets are owner/project scoped. Approval creates a job but
does not mutate the browser timeline; a reviewed proposal is still required.

### Rendering

```text
VideoProject -> Zod validation -> immutable SQLite snapshot
             -> infrastructure/render job -> Remotion CLI -> MP4
```

`src/index.ts` and the `MainVideo` composition ID are public runtime contracts.
Generated temporary files remain outside source media, and cancellation owns
only the process tree and files created by that job.

## Persistence and migrations

- Browser project persistence is implemented by
  `src/editor/persistence/ProjectStorage.ts`.
- Server data uses `better-sqlite3` with WAL, a 5-second busy timeout, foreign
  keys and `synchronous=NORMAL`.
- Checked-in SQL under `drizzle/` is the runtime schema authority. Drizzle
  TypeScript declarations in `src/infrastructure/db/schema` are the typed model
  used to generate subsequent additive migrations.
- `migrations.ts` safely adopts databases created by the former embedded DDL,
  refuses partial baselines or duplicate snapshot revisions, and then applies
  checked-in migrations. Migration files are included in Windows packages.
- Vitest always forces `ICEGOZI_DB_PATH=:memory:` so tests cannot inherit a
  developer or production database path.

## Binary and filesystem rules

- `MediaBinaryResolver.ts` resolves FFmpeg and FFprobe consistently in this
  order: explicit environment path, bundled binary, system lookup, WinGet
  fallback, then command name.
- `public/assets` is source media and must not be deleted by generated-file
  cleanup.
- Asset and generation paths are canonicalized and checked for containment
  before read, promotion or deletion.
- Installed app files use `ICEGOZI_APP_ROOT`; user-writable projects, media,
  outputs and SQLite use `ICEGOZI_DATA_DIR`.

## Naming and extension rules

- Feature and technical directories use kebab-case; React components use
  `PascalCase.tsx`; hooks use `useSomething.ts`.
- Services and repositories have explicit feature ownership. Avoid generic
  `common`, `helper` or nested `shared/utils` modules.
- A module is moved to `shared` only when it is genuinely owner-neutral. Types
  crossing an application boundary belong beside that application feature.
- Preserve serialized project fields, storage keys, API routes, composition IDs
  and database names during structural refactors.

## Verification

Run these gates after structural changes:

```powershell
npm run typecheck
npm test
npm run build:editor
npm run build:app
```

Use focused integration tests for the touched adapter or workflow before the
full suite. Windows package verification additionally requires Node 24 and the
bundled native binaries.
