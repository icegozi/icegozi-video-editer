# BASE_CODE_PLAN: Programmable Video Editing System Base Architecture

> **Repository:** `icegozi_video`  
> **Target:** Production-Ready Base Code Architecture for AI-Assisted Programmable Video Editing  
> **Status:** Pending Approval (`STOP CONDITION` active - awaiting `OK triển khai`)  
> **Author:** Principal Software Architect & Senior Video Pipeline Engineer  

---

## 1. Current Repository State

- **Filesystem Location:** `d:\My Project\Github\icegozi_video`
- **Current Content:** Completely empty workspace directory (0 files, 0 directories).
- **Git State:** Uninitialized (`.git` does not exist yet).
- **Package Manager State:** No lock files present (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` do not exist).
- **Decision:** Use `npm` as the designated package manager in accordance with project engineering principles.

---

## 2. Existing Technologies & Tools

- **Node.js:** `v24.11.0` (Active and verified, supports modern ECMAScript, ESM, worker threads, native fetch).
- **npm:** `11.6.1` (Active and verified).
- **FFmpeg:** `9.0.2-full_build-www.gyan.dev` (Built with GCC 16.2.0 MSYS2, verified working at `C:\Users\ADMIN\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe`).
  - Enabled encoders: `libx264`, `libx265`, `libsvtav1`, `libvpx`, `libaac`, `libopus`, `flite`, `whisper`, hardware acceleration (`d3d11va`, `d3d12va`, `nvenc`, `amf`, `vulkan`).
- **FFprobe:** `9.0.2-full_build-www.gyan.dev` (Verified working at same path).
- **Operating System:** Windows 11 x64, PowerShell shell.
- **Globally Installed Remotion Agent Skills:** Detected and inspected at `C:\Users\ADMIN\.agents\skills/`:
  - `remotion-best-practices`
  - `remotion-create`
  - `remotion-multimedia`
  - `remotion-render`
  - `remotion-captions`
  - `remotion-studio`
  - `remotion-docs`

---

## 3. Environment Status

- **Host Environment:** Clean and healthy.
- **Node runtime:** Meets and exceeds the required Node 18+ / 20+ requirements for Remotion 4.x.
- **FFmpeg & FFprobe:** Installed and capable of high-performance media transcoding, metadata probing, audio normalization, frame extraction, and concatenation.
- **Path Isolation:** Subprocess shells spawned in sandboxed terminals on Windows do not automatically inherit updated WinGet PATH values without explicit discovery or environment refresh.

---

## 4. Problems Found & Architectural Mitigations

| Issue / Finding | Impact | Architectural Mitigation |
| :--- | :--- | :--- |
| **P1: WinGet PATH Latency** | Active terminal sessions / spawned subshells may fail `where ffmpeg` if PATH was modified post-shell launch. | Implement multi-stage binary discovery in `FfmpegClient` and `FfprobeClient`: (1) Check `FFMPEG_PATH` env var; (2) Check system `PATH`; (3) Fall back to default WinGet installation directory (`Gyan.FFmpeg_*/ffmpeg-*-full_build/bin`). |
| **P2: Windows Path Separators & Spaces** | `d:\My Project\Github\...` contains a space. Unescaped shell strings cause execution failure or injection vulnerabilities. | Strictly invoke child processes using `child_process.execFile` or `child_process.spawn` with argument arrays. **Never** concatenate unvalidated strings into shell command lines. Use `node:path` methods (`join`, `resolve`, `normalize`) everywhere. |
| **P3: Non-Destructive Invariant** | Modifying source clips corrupts raw media. | Enforce directory partitioning: `public/assets/` is strictly Read-Only for automated pipelines. All normalized clips, extracted frames, and intermediate renders are written exclusively to `generated/`, and final renders to `output/`. |
| **P4: Git Tracking Safety** | Empty workspace risks committing heavy intermediate `.mp4` files and `node_modules`. | Establish a comprehensive `.gitignore` in Phase 1 before running any installations or renders. |
| **P5: React 19 vs Ecosystem Peer Dependencies** | Remotion 4.0.x is fully compatible with React 19 / React 18, but explicit version pinning in `package.json` avoids package resolution conflicts. | Pin React `^19.0.0` or `^18.3.1` with matching `@types/react` systematically. |

---

## 5. Proposed Architecture

We adopt a **Pragmatic Modular Architecture** with strict boundaries and zero unnecessary abstractions:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      PRESENTATION / REMOTION                           │
│  Root.tsx ──► MainVideo.tsx ──► SceneRenderer.tsx ──► SceneRegistry    │
│  Primitives: VideoFrame | MediaLayer | AudioLayer | TextOverlay        │
│              FormulaOverlay | SubtitleLayer | SafeArea                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ consumes
┌───────────────────────────────────▼────────────────────────────────────┐
│                            APPLICATION                                 │
│  Timeline Engine:   buildTimeline | validateTimeline | calcDuration    │
│  Media Engine:      inspectMedia | validateAssets | normalizeMedia     │
│  Render Engine:     prepareRender (Preview / Final profiles)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ operates on / validates
┌───────────────────────────────────▼────────────────────────────────────┐
│                              DOMAIN                                    │
│  Pure TypeScript Models & Rules (Zero external framework dependencies) │
│  VideoProject | Scene | MediaAsset | AudioTrack | Transition           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ calls
┌───────────────────────────────────▼────────────────────────────────────┐
│                          INFRASTRUCTURE                                │
│  FfmpegClient (Safe spawn, execFile, discovery, error wrapping)       │
│  FfprobeClient (Typed MediaMetadata extraction)                        │
│  Commands: trim | concat | normalize | extractFrame | audio            │
│  FileSystem & Paths: cross-platform path resolution, directory guards  │
│  Logger: structured levels (debug, info, warn, error)                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Final Folder Structure

```
icegozi_video/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── remotion.config.ts
├── README.md
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── WORKFLOW.md
│   ├── ADDING_A_SCENE.md
│   └── MEDIA_GUIDE.md
│
├── projects/
│   └── demo/
│       ├── project.ts
│       └── scenes/
│
├── public/
│   └── assets/
│       ├── video/
│       ├── audio/
│       ├── images/
│       ├── fonts/
│       └── subtitles/
│
├── generated/
│   ├── normalized/
│   ├── frames/
│   ├── previews/
│   └── temp/
│
├── output/
│
├── scripts/
│   ├── inspect-media.ts
│   ├── validate-assets.ts
│   ├── extract-frame.ts
│   ├── normalize-media.ts
│   ├── render-preview.ts
│   └── clean-generated.ts
│
├── tests/
│   ├── unit/
│   │   ├── timeline.test.ts
│   │   ├── paths.test.ts
│   │   ├── validation.test.ts
│   │   ├── ffmpeg-commands.test.ts
│   │   └── scene-registry.test.ts
│   └── fixtures/
│       └── mock-project.ts
│
└── src/
    ├── app/
    │   ├── Root.tsx
    │   ├── compositions.ts
    │   └── registerCompositions.ts
    │
    ├── video/
    │   ├── compositions/
    │   │   ├── MainVideo/
    │   │   │   ├── MainVideo.tsx
    │   │   │   ├── MainVideo.config.ts
    │   │   │   └── index.ts
    │   │   └── index.ts
    │   ├── scenes/
    │   │   ├── SceneRenderer.tsx
    │   │   ├── SceneRegistry.ts
    │   │   ├── implementations/
    │   │   │   ├── VideoScene.tsx
    │   │   │   ├── ImageScene.tsx
    │   │   │   ├── TextScene.tsx
    │   │   │   ├── FormulaScene.tsx
    │   │   │   └── CompositionScene.tsx
    │   │   └── index.ts
    │   ├── components/
    │   │   ├── VideoFrame/
    │   │   │   ├── VideoFrame.tsx
    │   │   │   └── index.ts
    │   │   ├── MediaLayer/
    │   │   │   ├── MediaLayer.tsx
    │   │   │   └── index.ts
    │   │   ├── AudioLayer/
    │   │   │   ├── AudioLayer.tsx
    │   │   │   └── index.ts
    │   │   ├── TextOverlay/
    │   │   │   ├── TextOverlay.tsx
    │   │   │   └── index.ts
    │   │   ├── FormulaOverlay/
    │   │   │   ├── FormulaOverlay.tsx
    │   │   │   └── index.ts
    │   │   ├── SubtitleLayer/
    │   │   │   ├── SubtitleLayer.tsx
    │   │   │   └── index.ts
    │   │   └── SafeArea/
    │   │       ├── SafeArea.tsx
    │   │       └── index.ts
    │   ├── transitions/
    │   │   ├── CrossFade.tsx
    │   │   ├── Fade.tsx
    │   │   ├── transition.types.ts
    │   │   └── index.ts
    │   ├── animation/
    │   │   ├── easing.ts
    │   │   ├── interpolate.ts
    │   │   └── timing.ts
    │   └── hooks/
    │       └── useTimelineProgress.ts
    │
    ├── domain/
    │   ├── video/
    │   │   ├── VideoProject.ts
    │   │   ├── Timeline.ts
    │   │   ├── Scene.ts
    │   │   ├── MediaAsset.ts
    │   │   ├── AudioTrack.ts
    │   │   ├── Transition.ts
    │   │   └── index.ts
    │   └── shared/
    │       ├── MathFormula.ts
    │       └── index.ts
    │
    ├── application/
    │   ├── timeline/
    │   │   ├── buildTimeline.ts
    │   │   ├── validateTimeline.ts
    │   │   └── calculateDuration.ts
    │   ├── media/
    │   │   ├── inspectMedia.ts
    │   │   ├── validateAssets.ts
    │   │   └── normalizeMedia.ts
    │   └── render/
    │       ├── prepareRender.ts
    │       └── render.types.ts
    │
    ├── infrastructure/
    │   ├── ffmpeg/
    │   │   ├── FfmpegClient.ts
    │   │   ├── FfprobeClient.ts
    │   │   ├── ffmpeg.types.ts
    │   │   ├── commands/
    │   │   │   ├── trim.ts
    │   │   │   ├── concat.ts
    │   │   │   ├── normalize.ts
    │   │   │   ├── extractFrame.ts
    │   │   │   └── audio.ts
    │   │   └── index.ts
    │   ├── filesystem/
    │   │   ├── FileSystem.ts
    │   │   ├── paths.ts
    │   │   └── ensureDirectories.ts
    │   ├── media/
    │   │   └── MediaMetadataReader.ts
    │   └── logging/
    │       └── logger.ts
    │
    ├── config/
    │   ├── video.config.ts
    │   ├── paths.config.ts
    │   ├── render.config.ts
    │   ├── env.ts
    │   └── index.ts
    │
    ├── schemas/
    │   ├── project.schema.ts
    │   ├── scene.schema.ts
    │   └── asset.schema.ts
    │
    ├── shared/
    │   ├── constants/
    │   │   └── defaultValues.ts
    │   ├── errors/
    │   │   └── pipelineErrors.ts
    │   ├── types/
    │   │   └── common.types.ts
    │   └── utils/
    │       └── stringUtils.ts
    │
    └── index.ts
```

---

## 7. Dependencies to Add

| Package | Type | Justification |
| :--- | :--- | :--- |
| `remotion` (`^4.0.0`) | `dependencies` | Core video composition runtime, timeline execution, and frame hooks. |
| `@remotion/cli` (`^4.0.0`) | `dependencies` | Remotion Studio browser server and command-line rendering engine. |
| `@remotion/media-utils` (`^4.0.0`) | `dependencies` | Video/audio metadata inspection in browser, dimensions & duration checking. |
| `@remotion/transitions` (`^4.0.0`) | `dependencies` | Production-grade transition primitives (`TransitionSeries`, fade, slide). |
| `@remotion/captions` (`^4.0.0`) | `dependencies` | Official type-safe subtitle and caption data structures. |
| `react` (`^19.0.0` or `^18.3.1`) | `dependencies` | React runtime required by Remotion component hierarchy. |
| `react-dom` (`^19.0.0` or `^18.3.1`) | `dependencies` | React DOM renderer required by Remotion. |
| `zod` (`^3.24.0`) | `dependencies` | Ultra-lightweight schema validation to catch malformed project and scene configs before rendering. |
| `typescript` (`^5.7.0`) | `devDependencies` | Strict static type checking across the entire project. |
| `@types/react`, `@types/react-dom`, `@types/node` | `devDependencies` | High-fidelity type definitions for Node 22/24 and React. |
| `tsx` (`^4.19.0`) | `devDependencies` | Cross-platform, zero-config TypeScript executor for CLI scripts in `scripts/`. |
| `vitest` (`^3.0.0`) | `devDependencies` | Fast, lightweight unit test runner with native TypeScript and ESM support. |
| `prettier` (`^3.5.0`) | `devDependencies` | Code formatting consistency. |
| `eslint` (`^9.0.0`) + typescript plugins | `devDependencies` | Static linting and code hygiene. |

---

## 8. Dependencies NOT Needed & Rejected

- **`fluent-ffmpeg` / `ffmpeg-static`:** Rejected. `Gyan.FFmpeg 9.0.2` is already installed and verified on the host system. `fluent-ffmpeg` is an outdated legacy wrapper with untyped callback patterns. Our native `FfmpegClient` offers direct, typed, promise-based, and secure execution.
- **`dotenv`:** Rejected. Node.js 20+ supports native `--env-file=.env` or our `env.ts` handles clean fallback resolution.
- **Dependency Injection Frameworks (`inversify`, `tsyringe`):** Rejected. Creates unnecessary boilerplate and cognitive load; pure functional dependency passing and direct classes are superior for this architecture.
- **Heavy UI Frameworks / TailwindCSS:** Rejected per specification (standard vanilla CSS and inline video styles provide maximum precision and zero build overhead for video canvas rendering).
- **`lodash`:** Rejected. Native modern ES2024 methods handle all math, arrays, and object operations cleanly.

---

## 9. Core Domain Models

### `VideoProject`
```ts
export interface VideoProject {
  id: string;
  title: string;
  fps: number;
  width: number;
  height: number;
  scenes: SceneConfig[];
  audioTracks?: AudioTrackConfig[];
  metadata?: Record<string, unknown>;
}
```

### `SceneConfig` (Discriminated Union)
```ts
export type SceneType = 'video' | 'image' | 'text' | 'formula' | 'composition';

export interface BaseSceneConfig {
  id: string;
  type: SceneType;
  durationInFrames: number;
  transition?: TransitionConfig;
}

export interface VideoSceneConfig extends BaseSceneConfig {
  type: 'video';
  src: string;
  volume?: number;
  playbackRate?: number;
  startFromFrame?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
}

export interface ImageSceneConfig extends BaseSceneConfig {
  type: 'image';
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  zoomAnimation?: boolean;
}

export interface TextSceneConfig extends BaseSceneConfig {
  type: 'text';
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  animationType?: 'fade' | 'slide-up' | 'typewriter';
}

export interface FormulaSceneConfig extends BaseSceneConfig {
  type: 'formula';
  latex: string;
  title?: string;
  explanation?: string;
  fontSize?: number;
}

export interface CompositionSceneConfig extends BaseSceneConfig {
  type: 'composition';
  componentName: string;
  props?: Record<string, unknown>;
}

export type SceneConfig =
  | VideoSceneConfig
  | ImageSceneConfig
  | TextSceneConfig
  | FormulaSceneConfig
  | CompositionSceneConfig;
```

### `Timeline`
```ts
export interface ComputedScene<T extends SceneConfig = SceneConfig> {
  scene: T;
  startFrame: number;
  durationInFrames: number;
  endFrame: number;
}

export interface ProjectTimeline {
  totalDurationInFrames: number;
  totalDurationInSeconds: number;
  fps: number;
  computedScenes: ComputedScene[];
}
```

### `AudioTrack`
```ts
export interface AudioTrackConfig {
  id: string;
  type: 'voice' | 'music' | 'sfx';
  src: string;
  startFrame: number;
  durationInFrames?: number;
  volume: number; // 0.0 to 1.0
  fadeInFrames?: number;
  fadeOutFrames?: number;
  loop?: boolean;
}
```

---

## 10. Scene Architecture & Registry

To guarantee that adding a new scene type never requires modifying `MainVideo.tsx`:

1. **`SceneRegistry`:**
   ```ts
   type SceneComponent<P = any> = React.ComponentType<{ scene: P; computed: ComputedScene<P> }>;

   class SceneRegistry {
     private registry = new Map<SceneType, SceneComponent>();

     register<P extends SceneConfig>(type: SceneType, component: SceneComponent<P>): void {
       this.registry.set(type, component);
     }

     get(type: SceneType): SceneComponent {
       const comp = this.registry.get(type);
       if (!comp) throw new UnknownSceneTypeError(type);
       return comp;
     }

     has(type: SceneType): boolean {
       return this.registry.has(type);
     }
   }
   ```
2. **`SceneRenderer.tsx`:** Dynamically resolves the registered component for `computed.scene.type` and renders it inside `<VideoFrame>`.
3. **Built-in Implementations:**
   - `VideoScene`: Renders Remotion `<Video>` or `<OffthreadVideo>` with volume control.
   - `ImageScene`: Renders Remotion `<Img>` with smooth subtle motion.
   - `TextScene`: Renders typography, subtitles, and safe margins.
   - `FormulaScene`: Renders mathematical notation cleanly without relying on hallucinated AI images.
   - `CompositionScene`: Renders registered sub-compositions.

---

## 11. Timeline Architecture

Pure calculation routines located in `src/application/timeline/`:
- **`secondsToFrames(seconds: number, fps: number): number`**: Computes `Math.round(seconds * fps)`.
- **`framesToSeconds(frames: number, fps: number): number`**: Computes `frames / fps`.
- **`buildTimeline(project: VideoProject): ProjectTimeline`**:
  - Sequentially steps through `scenes`.
  - Calculates cumulative `startFrame` and `endFrame` for each scene.
  - Accounts for transition overlap when configured.
  - Returns fully computed timeline.
- **`validateTimeline(timeline: ProjectTimeline): void`**:
  - Validates `totalDurationInFrames > 0`.
  - Ensures each scene `durationInFrames > 0`.
  - Validates sequential ordering without negative offsets or invalid numbers.

---

## 12. FFmpeg Architecture

Implemented in `src/infrastructure/ffmpeg/`:
- **`FfmpegClient`:**
  - Auto-locates `ffmpeg.exe` via environment variable or WinGet fallback path.
  - Executes commands via `node:child_process.spawn` or `execFile` with explicit argument arrays.
  - Captures process exit codes, stdout, and stderr.
  - Logs execution details via `logger`.
  - Wraps failures into typed `FfmpegError` containing command, args, exit code, and actionable error details.
- **`FfprobeClient`:**
  - Invokes `ffprobe -v quiet -print_format json -show_format -show_streams <file>`.
  - Parses and maps JSON to typed `MediaMetadata` (width, height, fps, duration, videoCodec, audioCodec, sampleRate, pixelFormat, channels).
- **Command Builders (`src/infrastructure/ffmpeg/commands/`):**
  - `trim.ts`: Generates precise stream-copy or re-encoded trim arguments.
  - `concat.ts`: Generates concat demuxer instructions.
  - `normalize.ts`: Generates 1080p, H.264, yuv420p, 30fps, 48kHz AAC normalization arguments with letterboxing/pillarboxing padding.
  - `extractFrame.ts`: Extracts individual frames at specified timestamps as high-resolution PNGs.
  - `audio.ts`: Normalizes audio loudness using EBU R128 (`loudnorm`).

---

## 13. Asset Workflow & Non-Destructive Media Rules

```
Source Media (public/assets/) [READ ONLY]
          │
          ▼
   FFprobe Inspection (MediaMetadataReader)
          │
          ▼
   Asset Validation (validateAssets)
          │
          ├── (If already compatible 1080p H.264 30fps) ──► Direct Composition
          │
          └── (If normalization required)
                    │
                    ▼
          FFmpeg Normalization (normalizeMedia)
                    │
                    ▼
          generated/normalized/[asset_id]_[hash].mp4
                    │
                    ▼
          Remotion Timeline & Composition
```

- **Strict Invariant:** Source assets in `public/assets/` are NEVER overwritten or deleted.
- **Cleanup Guarantee:** `npm run clean:generated` cleans only `generated/` and temporary caches. Source assets are protected.

---

## 14. Render Workflow & Profiles

Centralized in `src/config/render.config.ts`:
- **`RenderProfile.Preview`:**
  - Resolution: `1280x720` (50% scale or lower bandwidth)
  - Codec: H.264, CRF: 28, Preset: `ultrafast`
  - Output: `generated/previews/[project-id]-preview.mp4`
  - Purpose: Rapid iteration and timing review.
- **`RenderProfile.Final`:**
  - Resolution: `1920x1080` (Full HD, 30fps)
  - Codec: H.264, CRF: 18, Preset: `slow`, Pixel Format: `yuv420p`
  - Audio: AAC 320kbps, 48kHz stereo
  - Output: `output/[project-id]-final.mp4`
  - Purpose: Production delivery.

---

## 15. Error Handling Architecture

Custom domain error hierarchy in `src/shared/errors/pipelineErrors.ts`:
- `VideoPipelineError` (Base error class with timestamp, errorCode, context object)
  - `MediaNotFoundError`: Asset does not exist at specified path.
  - `InvalidTimelineError`: Scene duration <= 0, invalid timeline bounds.
  - `InvalidProjectSchemaError`: Zod project or scene schema validation failure.
  - `FfmpegError`: Subprocess failure with exitCode, command args, stderr snippet.
  - `MediaInspectionError`: Probing failure or invalid media stream format.
  - `UnknownSceneTypeError`: SceneRegistry lookup failure for unsupported scene type.
  - `RenderPreparationError`: Missing assets or invalid profile prior to render kickoff.

---

## 16. Test Strategy

Lightweight, blazing-fast testing with **Vitest**:
- `tests/unit/timeline.test.ts`: Tests `secondsToFrames`, `framesToSeconds`, `buildTimeline` sequential offsets, total duration calculations.
- `tests/unit/validation.test.ts`: Tests Zod project schemas, detects negative durations and empty scene arrays.
- `tests/unit/scene-registry.test.ts`: Tests registering scenes, retrieving components, and error throwing for unregistered types.
- `tests/unit/ffmpeg-commands.test.ts`: Tests that FFmpeg command builders generate exact argument arrays without executing subprocesses.
- `tests/unit/paths.test.ts`: Tests cross-platform path resolution, relative asset calculation, and directory resolution on Windows.

---

## 17. Documentation Plan

1. **`README.md`**: Project overview, requirements (Node 24+, FFmpeg 9+), setup instructions, Remotion Studio guide, CLI script catalog, directory structure.
2. **`docs/ARCHITECTURE.md`**: Comprehensive architectural blueprint, domain boundaries, data flow diagrams, extension mechanics.
3. **`docs/WORKFLOW.md`**: End-to-end media pipeline lifecycle: ingestion -> inspection -> normalization -> composition -> studio preview -> final export.
4. **`docs/ADDING_A_SCENE.md`**: 4-step tutorial demonstrating how to create, type, implement, and register a new scene in under 5 minutes.
5. **`docs/MEDIA_GUIDE.md`**: Audio/video technical specifications, recommended codecs, container formats, and non-destructive intermediate storage guidelines.

---

## 18. Exact Files to Create

Below is the complete schedule of all files to create, including action, purpose, dependencies, risk, and priority classification:

### Root & Tooling Configuration

| FILE | ACTION | PURPOSE | DEPENDENCIES | RISK | PRIORITY |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `package.json` | CREATE | Defines project metadata, scripts (`dev`, `studio`, `render`, `test`, `media:*`), and dependencies. | npm | MINOR | **CRITICAL** |
| `tsconfig.json` | CREATE | Configures TypeScript with strict checking, ESM resolution, and path aliases (`@/*`). | typescript | MINOR | **CRITICAL** |
| `remotion.config.ts` | CREATE | Configures Remotion CLI, Chromium flags, and output formats. | remotion | MINOR | **CRITICAL** |
| `.gitignore` | CREATE | Prevents committing `node_modules`, `generated/`, `output/`, and `.env`. | git | MINOR | **CRITICAL** |
| `.env.example` | CREATE | Template for optional environment overrides (`VIDEO_DEFAULT_WIDTH`, `FFMPEG_PATH`). | None | MINOR | **IMPORTANT** |
| `README.md` | CREATE | Master documentation for developers and operators. | None | MINOR | **IMPORTANT** |

### Domain Layer (`src/domain/`)

| FILE | ACTION | PURPOSE | DEPENDENCIES | RISK | PRIORITY |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/domain/video/VideoProject.ts` | CREATE | Core domain model for declarative video projects. | None | MINOR | **CRITICAL** |
| `src/domain/video/Scene.ts` | CREATE | Domain definitions for SceneConfig and scene discriminated union. | None | MINOR | **CRITICAL** |
| `src/domain/video/Timeline.ts` | CREATE | Domain model for ProjectTimeline and ComputedScene. | None | MINOR | **CRITICAL** |
| `src/domain/video/MediaAsset.ts` | CREATE | Domain model for MediaAsset and MediaMetadata. | None | MINOR | **CRITICAL** |
| `src/domain/video/AudioTrack.ts` | CREATE | Domain model for AudioTrackConfig and audio types. | None | MINOR | **CRITICAL** |
| `src/domain/video/Transition.ts` | CREATE | Domain model for TransitionConfig and transition types. | None | MINOR | **CRITICAL** |
| `src/domain/video/index.ts` | CREATE | Barrel export for domain video models. | Domain files | MINOR | **IMPORTANT** |
| `src/domain/shared/MathFormula.ts` | CREATE | Domain model for mathematical formula structures. | None | MINOR | **IMPORTANT** |
| `src/domain/shared/index.ts` | CREATE | Barrel export for shared domain models. | None | MINOR | **MINOR** |

### Application Layer (`src/application/`)

| FILE | ACTION | PURPOSE | DEPENDENCIES | RISK | PRIORITY |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/application/timeline/calculateDuration.ts` | CREATE | Pure math for converting seconds to frames and vice versa. | None | MINOR | **CRITICAL** |
| `src/application/timeline/buildTimeline.ts` | CREATE | Computes sequential start and end frames for scenes. | Domain | MINOR | **CRITICAL** |
| `src/application/timeline/validateTimeline.ts` | CREATE | Validates timeline continuity and frame constraints. | Errors | MINOR | **CRITICAL** |
| `src/application/media/inspectMedia.ts` | CREATE | Probes media assets and converts raw stream data into typed metadata. | Infrastructure | MINOR | **CRITICAL** |
| `src/application/media/validateAssets.ts` | CREATE | Verifies asset existence and compliance before rendering. | Filesystem | MINOR | **CRITICAL** |
| `src/application/media/normalizeMedia.ts` | CREATE | Orchestrates media transcoding to 1080p H.264 into `generated/normalized/`. | FFmpeg | MINOR | **CRITICAL** |
| `src/application/render/prepareRender.ts` | CREATE | Prepares render options and resolves target profile. | Config | MINOR | **IMPORTANT** |
| `src/application/render/render.types.ts` | CREATE | Types for render profiles, progress, and results. | None | MINOR | **IMPORTANT** |

### Infrastructure Layer (`src/infrastructure/`)

| FILE | ACTION | PURPOSE | DEPENDENCIES | RISK | PRIORITY |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/infrastructure/logging/logger.ts` | CREATE | Structured console logger with levels (`debug`, `info`, `warn`, `error`). | None | MINOR | **CRITICAL** |
| `src/infrastructure/filesystem/paths.ts` | CREATE | Cross-platform directory resolver (`assets`, `generated`, `output`). | `node:path` | MINOR | **CRITICAL** |
| `src/infrastructure/filesystem/ensureDirectories.ts` | CREATE | Ensures all required runtime folders exist. | `node:fs` | MINOR | **CRITICAL** |
| `src/infrastructure/filesystem/FileSystem.ts` | CREATE | Safe filesystem wrapper for file existence and stats. | `node:fs` | MINOR | **CRITICAL** |
| `src/infrastructure/ffmpeg/ffmpeg.types.ts` | CREATE | Typed interfaces for FFmpeg execution options and probe streams. | None | MINOR | **CRITICAL** |
| `src/infrastructure/ffmpeg/FfmpegClient.ts` | CREATE | Executes FFmpeg subprocesses securely, captures output, and discovers binaries. | `node:child_process` | MINOR | **CRITICAL** |
| `src/infrastructure/ffmpeg/FfprobeClient.ts` | CREATE | Executes FFprobe and extracts typed JSON metadata. | `node:child_process` | MINOR | **CRITICAL** |
| `src/infrastructure/ffmpeg/commands/trim.ts` | CREATE | Builder for FFmpeg trim command arguments. | None | MINOR | **IMPORTANT** |
| `src/infrastructure/ffmpeg/commands/concat.ts` | CREATE | Builder for FFmpeg concat command arguments. | None | MINOR | **IMPORTANT** |
| `src/infrastructure/ffmpeg/commands/normalize.ts` | CREATE | Builder for FFmpeg normalization command arguments. | None | MINOR | **IMPORTANT** |
| `src/infrastructure/ffmpeg/commands/extractFrame.ts` | CREATE | Builder for extracting video frames as PNGs. | None | MINOR | **IMPORTANT** |
| `src/infrastructure/ffmpeg/commands/audio.ts` | CREATE | Builder for audio loudness normalization. | None | MINOR | **IMPORTANT** |
| `src/infrastructure/ffmpeg/index.ts` | CREATE | Barrel export for FFmpeg client and commands. | Infrastructure | MINOR | **IMPORTANT** |
| `src/infrastructure/media/MediaMetadataReader.ts` | CREATE | Adapter linking FFprobe client to domain `MediaAsset`. | FfprobeClient | MINOR | **IMPORTANT** |

### Configuration & Schemas (`src/config/`, `src/schemas/`)

| FILE | ACTION | PURPOSE | DEPENDENCIES | RISK | PRIORITY |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/config/video.config.ts` | CREATE | Centralized constants: default 1920x1080, 30 FPS, 16:9 aspect ratio. | None | MINOR | **CRITICAL** |
| `src/config/paths.config.ts` | CREATE | Centralized directory constants relative to `process.cwd()`. | None | MINOR | **CRITICAL** |
| `src/config/render.config.ts` | CREATE | Centralized render profile configurations (Preview vs Final). | None | MINOR | **IMPORTANT** |
| `src/config/env.ts` | CREATE | Safe environment variable reader with sensible defaults. | None | MINOR | **IMPORTANT** |
| `src/config/index.ts` | CREATE | Barrel export for configuration. | Config files | MINOR | **MINOR** |
| `src/schemas/project.schema.ts` | CREATE | Zod schema validating VideoProject. | `zod` | MINOR | **CRITICAL** |
| `src/schemas/scene.schema.ts` | CREATE | Zod schema validating Scene configurations. | `zod` | MINOR | **CRITICAL** |
| `src/schemas/asset.schema.ts` | CREATE | Zod schema validating MediaAsset. | `zod` | MINOR | **IMPORTANT** |

### Shared Utilities & Errors (`src/shared/`)

| FILE | ACTION | PURPOSE | DEPENDENCIES | RISK | PRIORITY |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/shared/errors/pipelineErrors.ts` | CREATE | Typed application error classes. | None | MINOR | **CRITICAL** |
| `src/shared/constants/defaultValues.ts` | CREATE | Safe fallbacks for volumes, dimensions, durations. | None | MINOR | **IMPORTANT** |
| `src/shared/types/common.types.ts` | CREATE | Common utility types. | None | MINOR | **MINOR** |
| `src/shared/utils/stringUtils.ts` | CREATE | Formatting and string helpers. | None | MINOR | **MINOR** |

### Presentation / Remotion Layer (`src/video/`, `src/app/`)

| FILE | ACTION | PURPOSE | DEPENDENCIES | RISK | PRIORITY |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/video/components/VideoFrame/VideoFrame.tsx` | CREATE | Container primitive handling full fill, aspect ratio, clipping, background. | React | MINOR | **CRITICAL** |
| `src/video/components/VideoFrame/index.ts` | CREATE | Export for VideoFrame. | VideoFrame | MINOR | **MINOR** |
| `src/video/components/MediaLayer/MediaLayer.tsx` | CREATE | Visual layer rendering video/image with objectFit, position, scale, opacity. | Remotion | MINOR | **CRITICAL** |
| `src/video/components/MediaLayer/index.ts` | CREATE | Export for MediaLayer. | MediaLayer | MINOR | **MINOR** |
| `src/video/components/AudioLayer/AudioLayer.tsx` | CREATE | Independent audio track with volume and fade curves. | Remotion | MINOR | **CRITICAL** |
| `src/video/components/AudioLayer/index.ts` | CREATE | Export for AudioLayer. | AudioLayer | MINOR | **MINOR** |
| `src/video/components/TextOverlay/TextOverlay.tsx` | CREATE | Styled text overlay with safe area margins and frame-based animations. | Remotion | MINOR | **CRITICAL** |
| `src/video/components/TextOverlay/index.ts` | CREATE | Export for TextOverlay. | TextOverlay | MINOR | **MINOR** |
| `src/video/components/FormulaOverlay/FormulaOverlay.tsx` | CREATE | Mathematical notation renderer (LaTeX/math formatting). | React | MINOR | **CRITICAL** |
| `src/video/components/FormulaOverlay/index.ts` | CREATE | Export for FormulaOverlay. | FormulaOverlay | MINOR | **MINOR** |
| `src/video/components/SubtitleLayer/SubtitleLayer.tsx` | CREATE | Safe-area aware subtitle renderer. | `@remotion/captions` | MINOR | **IMPORTANT** |
| `src/video/components/SubtitleLayer/index.ts` | CREATE | Export for SubtitleLayer. | SubtitleLayer | MINOR | **MINOR** |
| `src/video/components/SafeArea/SafeArea.tsx` | CREATE | TV/Social media safe area bounding box indicator. | React | MINOR | **IMPORTANT** |
| `src/video/components/SafeArea/index.ts` | CREATE | Export for SafeArea. | SafeArea | MINOR | **MINOR** |
| `src/video/transitions/transition.types.ts` | CREATE | Transition parameter interfaces. | None | MINOR | **IMPORTANT** |
| `src/video/transitions/Fade.tsx` | CREATE | Fade transition component. | Remotion | MINOR | **IMPORTANT** |
| `src/video/transitions/CrossFade.tsx` | CREATE | Crossfade transition component. | Remotion | MINOR | **IMPORTANT** |
| `src/video/transitions/index.ts` | CREATE | Barrel export for transitions. | Transitions | MINOR | **MINOR** |
| `src/video/animation/easing.ts` | CREATE | Deterministic frame-based easing curves. | None | MINOR | **IMPORTANT** |
| `src/video/animation/interpolate.ts` | CREATE | Frame interpolation helper wrappers. | Remotion | MINOR | **IMPORTANT** |
| `src/video/animation/timing.ts` | CREATE | Frame calculation timing helpers. | None | MINOR | **IMPORTANT** |
| `src/video/hooks/useTimelineProgress.ts` | CREATE | Hook returning normalized 0..1 scene progress. | Remotion | MINOR | **IMPORTANT** |
| `src/video/scenes/SceneRegistry.ts` | CREATE | Extensible registry for scene type implementations. | React | MINOR | **CRITICAL** |
| `src/video/scenes/SceneRenderer.tsx` | CREATE | Dispatches computed scene to registered React component. | SceneRegistry | MINOR | **CRITICAL** |
| `src/video/scenes/implementations/VideoScene.tsx` | CREATE | Video clip scene component. | MediaLayer | MINOR | **CRITICAL** |
| `src/video/scenes/implementations/ImageScene.tsx` | CREATE | Static image clip scene component. | MediaLayer | MINOR | **CRITICAL** |
| `src/video/scenes/implementations/TextScene.tsx` | CREATE | Text and title scene component. | TextOverlay | MINOR | **CRITICAL** |
| `src/video/scenes/implementations/FormulaScene.tsx` | CREATE | Mathematical formula scene component. | FormulaOverlay | MINOR | **CRITICAL** |
| `src/video/scenes/implementations/CompositionScene.tsx` | CREATE | Sub-composition scene component. | Remotion | MINOR | **IMPORTANT** |
| `src/video/scenes/index.ts` | CREATE | Barrel export for scenes. | Scenes | MINOR | **MINOR** |
| `src/video/compositions/MainVideo/MainVideo.tsx` | CREATE | Main composition orchestrator: drives timeline, scenes, audio tracks. | Remotion | MINOR | **CRITICAL** |
| `src/video/compositions/MainVideo/MainVideo.config.ts` | CREATE | Default props and metadata for MainVideo. | Domain | MINOR | **IMPORTANT** |
| `src/video/compositions/MainVideo/index.ts` | CREATE | Export for MainVideo. | MainVideo | MINOR | **MINOR** |
| `src/video/compositions/index.ts` | CREATE | Barrel export for compositions. | Compositions | MINOR | **MINOR** |
| `src/app/compositions.ts` | CREATE | Composition registration catalog. | Compositions | MINOR | **CRITICAL** |
| `src/app/registerCompositions.ts` | CREATE | Bootstrap file registering all built-in scene types into SceneRegistry. | SceneRegistry | MINOR | **CRITICAL** |
| `src/app/Root.tsx` | CREATE | Root Remotion entry point registering `<Composition>` elements. | Remotion | MINOR | **CRITICAL** |
| `src/index.ts` | CREATE | Primary library entry point. | Modules | MINOR | **IMPORTANT** |

### Demo Project & CLI Scripts

| FILE | ACTION | PURPOSE | DEPENDENCIES | RISK | PRIORITY |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `projects/demo/project.ts` | CREATE | Minimal working demo project (5-10s) exercising scenes, formulas, text, timeline. | Domain | MINOR | **CRITICAL** |
| `scripts/inspect-media.ts` | CREATE | CLI script probing a media file and outputting JSON metadata. | Infrastructure | MINOR | **IMPORTANT** |
| `scripts/validate-assets.ts` | CREATE | CLI script checking asset existence and integrity before render. | Application | MINOR | **IMPORTANT** |
| `scripts/extract-frame.ts` | CREATE | CLI script extracting a video frame to `generated/frames/`. | Infrastructure | MINOR | **IMPORTANT** |
| `scripts/normalize-media.ts` | CREATE | CLI script converting media to standard 1080p H.264 into `generated/normalized/`. | Application | MINOR | **IMPORTANT** |
| `scripts/render-preview.ts` | CREATE | CLI script executing fast 720p preview render via `@remotion/cli`. | Remotion CLI | MINOR | **IMPORTANT** |
| `scripts/clean-generated.ts` | CREATE | CLI script safely clearing `generated/` without touching source assets. | Filesystem | MINOR | **IMPORTANT** |

### Unit Tests (`tests/`)

| FILE | ACTION | PURPOSE | DEPENDENCIES | RISK | PRIORITY |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `tests/fixtures/mock-project.ts` | CREATE | Test fixture providing a complete valid `VideoProject`. | Domain | MINOR | **IMPORTANT** |
| `tests/unit/timeline.test.ts` | CREATE | Unit tests for duration, conversion, and timeline layout calculation. | Vitest | MINOR | **CRITICAL** |
| `tests/unit/paths.test.ts` | CREATE | Unit tests for path resolution and cross-platform safety. | Vitest | MINOR | **IMPORTANT** |
| `tests/unit/validation.test.ts` | CREATE | Unit tests for Zod project validation schemas. | Vitest | MINOR | **CRITICAL** |
| `tests/unit/ffmpeg-commands.test.ts` | CREATE | Unit tests verifying FFmpeg command builders. | Vitest | MINOR | **IMPORTANT** |
| `tests/unit/scene-registry.test.ts` | CREATE | Unit tests verifying SceneRegistry registration and retrieval. | Vitest | MINOR | **CRITICAL** |

### Documentation (`docs/`)

| FILE | ACTION | PURPOSE | DEPENDENCIES | RISK | PRIORITY |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `docs/ARCHITECTURE.md` | CREATE | Detailed architectural documentation, tier definitions, data flow. | None | MINOR | **IMPORTANT** |
| `docs/WORKFLOW.md` | CREATE | Video editing workflow guide for humans and AI pipelines. | None | MINOR | **IMPORTANT** |
| `docs/ADDING_A_SCENE.md` | CREATE | Step-by-step developer guide for adding a new scene type. | None | MINOR | **IMPORTANT** |
| `docs/MEDIA_GUIDE.md` | CREATE | Asset formats, normalization rules, and folder management guide. | None | MINOR | **IMPORTANT** |

---

## 19. Exact Files to Modify

*Currently, the repository is completely blank.*  
**Number of existing files to modify: 0.**  
All items are new creations (`ACTION: CREATE`).

---

## 20. Risks & Mitigations

1. **Risk: Windows Subprocess Hangs / Shell Quoting Issues**
   - *Impact:* FFmpeg commands could hang or fail if paths contain spaces.
   - *Mitigation:* We use Node's `child_process.execFile` and `spawn` with an array of arguments, bypassing `cmd.exe`/`powershell.exe` command string parsing entirely.
2. **Risk: Package Manager Divergence**
   - *Impact:* Mixing `npm` and `pnpm`/`yarn` creates duplicate lock files.
   - *Mitigation:* Standardize on `npm` per user instruction.
3. **Risk: Remotion Studio Port Conflict**
   - *Impact:* Port 3000 may already be in use (e.g. MedStock app currently running on localhost:3000).
   - *Mitigation:* Configure Studio script with `--port=3100` or let Remotion automatically find an open port.
4. **Risk: Heavy Memory Usage during Video Renders**
   - *Impact:* High-resolution video rendering can consume significant memory.
   - *Mitigation:* Centralize concurrency settings in `remotion.config.ts` (`--concurrency` configured safely for local cores).

---

## 21. Implementation Order (For Phase 2)

```
Step 1: Project & Tooling Foundation
        ├── package.json
        ├── tsconfig.json
        ├── remotion.config.ts
        ├── .gitignore
        ├── .env.example
        └── npm install

Step 2: Configuration & Shared Foundation
        ├── src/config/ (video, paths, render, env)
        ├── src/shared/ (errors, constants, types)
        └── src/infrastructure/filesystem/ & logging/

Step 3: Domain Models & Schemas
        ├── src/domain/video/ (VideoProject, Scene, Timeline, etc.)
        └── src/schemas/ (project.schema, scene.schema, asset.schema)

Step 4: Application Layer (Timeline & Media Logic)
        ├── src/application/timeline/ (buildTimeline, validateTimeline, calculateDuration)
        └── src/application/media/ (validateAssets, inspectMedia, normalizeMedia)

Step 5: Infrastructure Layer (FFmpeg & FFprobe)
        ├── src/infrastructure/ffmpeg/ (FfmpegClient, FfprobeClient)
        └── src/infrastructure/ffmpeg/commands/ (trim, concat, normalize, extractFrame, audio)

Step 6: Presentation / Remotion Primitives
        ├── src/video/components/ (VideoFrame, MediaLayer, AudioLayer, TextOverlay, FormulaOverlay, SubtitleLayer, SafeArea)
        ├── src/video/transitions/ (Fade, CrossFade)
        └── src/video/animation/ (easing, interpolate, timing)

Step 7: Scene Registry & Scene Implementations
        ├── src/video/scenes/SceneRegistry.ts
        ├── src/video/scenes/SceneRenderer.tsx
        └── src/video/scenes/implementations/ (VideoScene, ImageScene, TextScene, FormulaScene, CompositionScene)

Step 8: Main Composition & Root Registration
        ├── src/video/compositions/MainVideo/
        ├── src/app/registerCompositions.ts
        ├── src/app/compositions.ts
        └── src/app/Root.tsx

Step 9: Demo Project & Public Assets Directory
        ├── public/assets/ (video, audio, images, fonts, subtitles)
        └── projects/demo/project.ts

Step 10: Automation Scripts
        ├── scripts/clean-generated.ts
        ├── scripts/inspect-media.ts
        ├── scripts/validate-assets.ts
        ├── scripts/normalize-media.ts
        ├── scripts/extract-frame.ts
        └── scripts/render-preview.ts

Step 11: Unit Tests
        ├── tests/fixtures/mock-project.ts
        ├── tests/unit/timeline.test.ts
        ├── tests/unit/paths.test.ts
        ├── tests/unit/validation.test.ts
        ├── tests/unit/scene-registry.test.ts
        └── tests/unit/ffmpeg-commands.test.ts

Step 12: Comprehensive Documentation
        ├── README.md
        ├── docs/ARCHITECTURE.md
        ├── docs/WORKFLOW.md
        ├── docs/ADDING_A_SCENE.md
        └── docs/MEDIA_GUIDE.md

Step 13: Quality Gates & Verification
        ├── npm run typecheck
        ├── npm run test
        ├── npm run render:preview (test demo render)
        └── Verify Remotion Studio launch
```

---

## STOP CONDITION

Per Section 44 of the requirements:
- **No dependencies have been installed.**
- **No source code has been created.**
- **No Remotion project has been initialized.**
- **No rendering has occurred.**

The plan is finalized and ready for review. Awaiting explicit instruction:
**`OK triển khai`**
