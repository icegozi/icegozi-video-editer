# Icegozi Video (Programmable Video Pipeline)

A production-grade, AI-assisted programmable video editing system built on **Remotion**, **TypeScript**, **React**, and **FFmpeg**.

Designed for high-precision motion graphics, mathematical formulas, text overlays, multi-track audio, and AI-generated video workflows with non-destructive media pipelines.

---

## Prerequisites

- **Node.js**: `v20.x` or `v24.x` (verified on Node `v24.11.0`)
- **FFmpeg & FFprobe**: Version 6.0+ (verified with `Gyan.FFmpeg 9.0.2-full_build`)
- **npm**: Version 10+ (verified on `11.6.1`)

---

## Getting Started

### Local editor with ChatGPT/Codex assistant

On Windows with Node 24, run `npm ci` then `npm run dev` and open
**http://127.0.0.1:3200**. Navigate to **AI Studio** tab → click **Đăng nhập**.
The local SIWC integration uses each user's own account and plan permission.
See [setup, licensing, security limits and verification](ASSISTANT_INTEGRATION.md).
If `npm run dev` is run again while this project's editor is already running,
it reports the existing URL instead of starting a duplicate server. To restart,
press `Ctrl+C` in the original server terminal first. If another app owns port
3200, stop that app or choose a port with `npm run dev -- --port 3201`.
The pinned runtime is Codex 0.160.1. `npm run build:app` builds the editor and
its local backend; `npm start` runs the built app with AI and render endpoints.
The MVP is for personal noncommercial use; paid, business or hosted use needs
provider/licensing review. No API-key fallback or billing management is included.

### Windows package

Build on Windows with Node 24:

```powershell
npm run package:windows
```

The command creates a portable folder under `build/releases/`. Run
`Start ICEGOZI.cmd` in that folder. It includes Node, production dependencies,
Codex, the Code Mode host and Chrome Headless Shell for rendering; Vite and a
global Codex installation are unnecessary.
Each user signs in with their own ChatGPT account. Writable projects, uploads
and renders use `%LOCALAPPDATA%/icegozi-video/workspace`; credentials stay in
the user's DPAPI-protected assistant storage and are excluded from the package.
Set `ICEGOZI_PORT` to change the default 3200 port, or `ICEGOZI_DATA_DIR` to
choose a workspace directory. `npm run codex:check-tools` tests native tool
execution against a local synthetic Responses server without real inference.

### Video skills and LLM tools

The app includes six workflows under `skills/video/`: video creation, short
videos, text motion, timeline edits, imported audio/captions and render checks.
Their names and descriptions are supplied to the assistant automatically; it
loads the relevant instructions through the app's `read_video_skill` tool.
The package includes the same files and does not need personal Codex skills.

The tool registry is in `src/application/assistant/editorTools.ts`. The LLM can
inspect live schemas with `get_editor_capabilities`, read the current project,
validate a candidate, propose a reviewed change, and request an approved preview
or final render. Unsupported fields are rejected rather than silently ignored.
Code Mode tool results are JSON strings and must be decoded with `JSON.parse`.
Toolset updates start a fresh native thread while retaining the UI chat history.

Example request: `Dùng skill icegozi-text-motion, tạo chữ A trắng trên nền đen,
phóng từ nhỏ đến lớn trong 5 giây.` Review the draft and click **Duyệt & Áp dụng**,
then ask for a preview or final render. Current media-generation/transcription
capabilities are explicitly reported by the catalog; imported assets can be used.

### 1. Installation

```bash
npm install
```

### 2. Launch Remotion Studio

Open the interactive video editor in your browser:

```bash
npm run studio
```

Studio launches at `http://localhost:3000` (or `http://localhost:3100` if port 3000 is occupied). You can scrub through scenes, preview mathematical formulas, inspect safe areas, and test transitions in real time.

---

## Declarative Video Projects

Videos are data-driven. Instead of hardcoding layout in React, videos are defined declaratively in `projects/`:

```ts
import { VideoProject } from '@/domain/video/VideoProject';

export const myProject: VideoProject = {
  id: 'math-explainer',
  title: 'The Beauty of Euler',
  fps: 30,
  width: 1920,
  height: 1080,
  scenes: [
    {
      id: 'intro',
      type: 'text',
      durationInFrames: 90, // 3 seconds
      title: 'DISCOVERING EULER',
      subtitle: 'The Most Beautiful Equation',
      backgroundColor: '#070A12',
      textColor: '#FFFFFF',
      transition: { type: 'fade', durationInFrames: 15 },
    },
    {
      id: 'equation',
      type: 'formula',
      durationInFrames: 120, // 4 seconds
      latex: 'e^{i\\pi} + 1 = 0',
      title: "Euler's Formula",
      explanation: 'Connecting five fundamental constants of mathematics.',
      fontSize: 72,
    },
  ],
};
```

---

## Media CLI Commands

The pipeline includes built-in cross-platform scripts for media inspection, validation, normalization, and frame extraction:

| Command | Purpose |
| :--- | :--- |
| `npm run typecheck` | Run strict TypeScript validation across the entire repository. |
| `npm run test` | Run the Vitest unit test suite (timeline math, schemas, commands, paths). |
| `npm run media:inspect <file>` | Probe video/audio streams and output technical JSON metadata. |
| `npm run media:validate` | Verify all assets referenced in the project exist before rendering. |
| `npm run media:normalize <file>` | Standardize any video to 1080p, 30fps H.264 into `generated/normalized/`. |
| `npm run render:preview` | Render a fast 720p draft MP4 into `generated/previews/`. |
| `npm run render` | Render the full 1080p production MP4 into `output/`. |
| `npm run clean:generated` | Clean intermediate generated files while protecting source media. |

### Extracting a Video Frame:

```bash
npx tsx scripts/extract-frame.ts <input-video> <timestamp-in-seconds>
```
Extracts a lossless PNG at the specified second into `generated/frames/`.

---

## Project Structure

```
icegozi_video/
├── src/
│   ├── app/                 # Root.tsx, compositions registration
│   ├── video/               # Remotion primitives, transitions, scenes, MainVideo
│   │   ├── components/      # VideoFrame, MediaLayer, AudioLayer, TextOverlay, FormulaOverlay, SubtitleLayer, SafeArea
│   │   ├── scenes/          # SceneRegistry, SceneRenderer, and scene implementations
│   │   ├── transitions/     # CrossFade, Fade
│   │   └── compositions/    # MainVideo orchestrator
│   ├── domain/              # Pure TypeScript models (VideoProject, Scene, Timeline, Audio, Media)
│   ├── application/         # Timeline engine, media inspection, asset validation, render prep
│   ├── infrastructure/      # FFmpegClient, FFprobeClient, FileSystem, paths, logger
│   ├── schemas/             # Zod runtime validation schemas
│   ├── config/              # Video defaults, render profiles, paths, env
│   └── shared/              # Pipeline error hierarchy, constants, types
├── projects/
│   └── demo/                # Working demo project definition
├── public/assets/           # READ-ONLY source video, audio, images, fonts
├── generated/               # Non-destructive intermediates (normalized, frames, previews)
├── output/                  # Final production MP4 exports
├── scripts/                 # Cross-platform CLI pipeline scripts
├── tests/                   # Vitest unit test suite
└── docs/                    # Architecture, workflow, and developer guides
```

---

## Adding a New Scene Type

Adding scene types is fully decoupled:
1. Define the scene interface in `src/domain/video/Scene.ts`.
2. Add schema validation in `src/schemas/scene.schema.ts`.
3. Create the React component in `src/video/scenes/implementations/`.
4. Register with `SceneRegistry.register('my-type', MySceneComponent)` in `src/app/registerCompositions.ts`.

See [docs/infrastructure/ADDING_A_SCENE.md](docs/infrastructure/ADDING_A_SCENE.md) for a complete walkthrough.

---

## Documentation

- 📐 [Architecture Specification](docs/infrastructure/ARCHITECTURE.md)
- 🎬 [Editing & AI Workflow Guide](docs/infrastructure/WORKFLOW.md)
- 🧩 [Adding a Scene Tutorial](docs/infrastructure/ADDING_A_SCENE.md)
- 🎞️ [Technical Media Specifications](docs/infrastructure/MEDIA_GUIDE.md)

---

## License

Private repository - all rights reserved.
