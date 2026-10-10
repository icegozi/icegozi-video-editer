# EDITOR_UI_REDESIGN_PLAN: Enterprise Video Editor Workspace Redesign

> **Target Repository:** `icegozi_video`  
> **Status:** Pending Review (`STOP RULE` Active - Awaiting `OK triển khai`)  
> **Role:** Principal Product Designer, Enterprise UX Architect, Senior Frontend Engineer  

---

## 1. Executive Summary & Design Vision

The current `icegozi_video` codebase contains a solid, deterministic media composition backend and Remotion render pipeline. However, operating it requires either CLI commands or the default Remotion Studio interface, which lacks:
- A high-density, multi-track NLE (Non-Linear Editing) timeline.
- A context-sensitive inspector panel for fine-grained property adjustment.
- An asset management browser with drag-and-drop readiness.
- Resizable split workspaces and keyboard-first editing workflows.

This plan redesigns the workspace into a **desktop-class, enterprise-grade video editor** combining the precision of **Adobe Premiere Pro / DaVinci Resolve**, the speed and ergonomics of **Figma**, and the density of **VS Code**.

---

## 2. Current UI Audit

### 2.1 Existing Components & Assets
- **Video Compositions (`src/video/compositions/MainVideo/`)**:
  - `MainVideo.tsx`: Data-driven composition mapping scenes to `<Sequence>` tags.
  - `MainVideo.config.ts`: Configuration defaults.
- **Visual Primitives (`src/video/components/`)**:
  - `VideoFrame`, `MediaLayer`, `AudioLayer`, `TextOverlay`, `FormulaOverlay`, `SubtitleLayer`, `SafeArea`.
- **Scenes & Registry (`src/video/scenes/`)**:
  - `SceneRegistry.ts` (extensible registry), `SceneRenderer.tsx`, and 5 scene implementations (`VideoScene`, `ImageScene`, `TextScene`, `FormulaScene`, `CompositionScene`).
- **Domain & Application**:
  - Pure domain models (`VideoProject`, `SceneConfig`, `AudioTrackConfig`, `Timeline`).
  - Timeline calculation utilities (`buildTimeline`, `secondsToFrames`, `framesToSeconds`, `validateTimeline`).

### 2.2 Reusable Components
- `MainVideo.tsx` will be reused directly as the composition component inside `@remotion/player`.
- `buildTimeline`, `secondsToFrames`, `framesToSeconds` will be reused for timeline mathematics.
- All visual primitives (`FormulaOverlay`, `TextOverlay`, etc.) remain intact and untouched, ensuring zero disruption to final video rendering.

### 2.3 Identified Problems & Deficiencies

| Severity | Issue | Impact on User Experience |
| :--- | :--- | :--- |
| **CRITICAL** | **Lack of Multi-Track NLE Workspace** | Current Remotion Studio renders clips sequentially on a flat bar. There is no multi-track layout for Video (V1, V2), Text overlays, and independent Audio tracks (A1, A2). |
| **CRITICAL** | **No Context-Sensitive Inspector** | Properties (formula LaTeX, text title, subtitle, duration, position, volume) must be changed by manually editing TypeScript files instead of an interactive panel. |
| **CRITICAL** | **No Interactive Clip Trimming & Snapping** | Editors cannot drag clip boundaries, preview start/duration tooltips, or snap to the playhead and clip boundaries. |
| **IMPORTANT** | **Fixed, Non-Resizable Panels** | Studio has rigid panels that cannot be resized to prioritize either preview canvas or timeline density. |
| **IMPORTANT** | **Inconsistent Styling & Lack of Design Tokens** | Components lack a centralized dark-mode token system (`--bg-app`, `--bg-panel`, `--accent`, etc.). |
| **IMPORTANT** | **No Keyboard Shortcut Architecture** | Key editing operations (Space for Play/Pause, Delete for clip removal, Ctrl+Z for undo, +/- for timeline zoom) are not unified with input focus guards. |
| **MINOR** | **Lack of Tabular Numeric Typography** | Numerical timecode displays and frame counts jitter horizontally during scrubbing without `font-variant-numeric: tabular-nums`. |

---

## 3. Core Design Principles

1. **Clarity**: Every panel has an explicit single responsibility (Assets, Preview, Properties, Timeline).
2. **Hierarchy**: The Preview Canvas and Timeline are the primary focal points; decorative chrome is eliminated.
3. **Density**: Compact enterprise density (32px standard controls, 28px compact buttons, 11–13px typography).
4. **Focus**: Neutral dark theme (`#0B0D10` to `#1B2027`) ensures video content stands out without visual competition.
5. **Predictability**: Identical drag, trim, select, and snap interactions across all tracks.
6. **Non-Destructive**: All editing actions operate on declarative project state. Source files in `public/assets/` remain read-only.
7. **Keyboard-First**: High-frequency operations function via shortcuts with strict input-focus guards.

---

## 4. Enterprise Design System

### 4.1 Semantic Color Palette (`src/editor/tokens/colors.ts`)

```css
:root {
  /* Surface hierarchy */
  --bg-app: #0B0D10;
  --bg-panel: #111419;
  --bg-panel-elevated: #161A20;
  --bg-surface: #1B2027;
  --bg-hover: #222832;
  --bg-active: #29313D;

  /* Borders */
  --border-subtle: #252B34;
  --border-default: #303844;
  --border-strong: #414B59;

  /* Typography */
  --text-primary: #F2F4F7;
  --text-secondary: #AAB2BF;
  --text-muted: #737D8C;
  --text-disabled: #515A66;

  /* Primary Accent */
  --accent: #5B8CFF;
  --accent-hover: #73A0FF;
  --accent-active: #4777E6;
  --accent-soft: rgba(91, 140, 255, 0.14);

  /* Semantic Feedback */
  --success: #35C78A;
  --warning: #F2B84B;
  --danger: #E66363;
  --info: #5B8CFF;

  /* Timeline Playhead & Guides */
  --playhead: #FF5D73;
  --snap-guide: #5B8CFF;
}
```

### 4.2 Track Color Family
Clips are color-coded by media type using muted, low-saturation tones:

| Media Type | Family | Base Background | Selected Border / Glow |
| :--- | :--- | :--- | :--- |
| **Video** | Muted Blue | `#1E293B` | `rgba(91, 140, 255, 0.9)` |
| **Audio** | Muted Emerald | `#14382A` | `rgba(53, 199, 138, 0.9)` |
| **Image** | Muted Violet | `#2D2244` | `rgba(167, 139, 250, 0.9)` |
| **Text** | Muted Amber | `#3A2A18` | `rgba(242, 184, 75, 0.9)` |
| **Formula** | Muted Cyan | `#123845` | `rgba(56, 189, 248, 0.9)` |
| **Composition** | Muted Indigo | `#22244C` | `rgba(129, 140, 248, 0.9)` |

### 4.3 Typography Scale (`src/editor/tokens/typography.ts`)
Font family: `Inter, ui-sans-serif, system-ui, -apple-system, sans-serif`.

| Role | Font Size | Weight | Line Height | Attributes |
| :--- | :--- | :--- | :--- | :--- |
| **Editor App Title** | 14px | 600 | 18px | Letter-spacing: -0.01em |
| **Panel Header Title** | 12px | 600 | 16px | Uppercase, tracking: 0.04em |
| **Control / Field Label**| 11px | 500 | 14px | Color: `--text-secondary` |
| **Standard Body** | 12px | 400 | 16px | Color: `--text-primary` |
| **Button Text** | 12px | 500 | 16px | Medium contrast |
| **Timeline Clip Title** | 11px | 500 | 14px | Truncated ellipsis |
| **Timecode / Numbers** | 12px | 500 | 16px | `font-variant-numeric: tabular-nums` |
| **Secondary / Meta** | 10px | 400 | 13px | Color: `--text-muted` |

### 4.4 Spacing & Border Radii
- **Base Grid**: 4px (`4`, `8`, `12`, `16`, `20`, `24`, `32`).
- **Panel Padding**: 12px.
- **Dense Control Rows**: 8px gap.
- **Radii**: Small control: `4px`; button/input: `6px`; panel/card: `8px`; floating popover: `8px`; timeline clips: `4px`.
- **Shadows**: Panels use 1px borders (`--border-subtle`). Shadows reserved strictly for floating overlays (menus, popovers, tooltips: `0 8px 24px rgba(0, 0, 0, 0.6)`).

---

## 5. Panel Dimensions & Resizable Split Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL COMMAND BAR (52px fixed height)                                      │
├──────────────┬───────────────────────────────────────────────┬──────────────┤
│ ASSET PANEL  │ PREVIEW WORKSPACE                             │ INSPECTOR    │
│ (280px def,  │ - Canvas Toolbar (36px)                       │ (320px def,  │
│  220-420px)  │ - Fitted Remotion Player Canvas               │  280-480px)  │
│              │ - Transport Bar (40px)                        │              │
├──────────────┴───────────────────────────────────────────────┴──────────────┤
│ TIMELINE TOOLBAR (36px fixed height)                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ TIMELINE (320px default, 180px min to 65vh max)                             │
│ - Track Headers (200px sticky left) | Ruler (28px sticky top)                │
│ - Tracks (V1, V2, A1, A2) with Draggable/Trimmable Clips                     │
│ - Vertical Scrubbing Playhead & Snapping Guides                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Detailed Panel Architecture

### 6.1 Global Command Bar (52px)
- **Left**: Minimal app icon (`Icegozi Editor`), project title indicator (`The Beauty of Mathematics`), status dot (`● Saved` / `● Editing`).
- **Center**: Quick search / command trigger (`Ctrl + K`).
- **Right**: Undo (`Ctrl + Z`), Redo (`Ctrl + Shift + Z`), Zoom controls, Export button (prominent accent button), Settings toggle.

### 6.2 Left Asset Panel (280px)
- **Header (36px)**: `MEDIA ASSETS` with `[+ Import]` button.
- **Search (32px)**: Search input with instant filter.
- **Category Tabs**: `All`, `Video`, `Audio`, `Images`, `Formulas`.
- **Asset Item**: 36px compact row showing type icon, file name, duration/dimensions, drag handle.
- **Non-Destructive Rule**: Deleting an item removes it from project scenes; files in `public/assets/` are never deleted.

### 6.3 Center Preview Workspace
- **Canvas Toolbar (36px)**: Aspect ratio indicator (`16:9 1920x1080`), Zoom select (`Fit`, `25%`, `50%`, `100%`, `200%`), Toggle Safe Area overlay (`Title Safe`, `Action Safe`), Fullscreen preview toggle.
- **Viewport Canvas**: Centered container with letterboxing background (`#080A0D`). Embeds `@remotion/player` running `MainVideo` with high precision.
- **Transport Controls (40px)**:
  - Step Backward 1 Frame (`Arrow Left`)
  - Play / Pause (`Space`)
  - Step Forward 1 Frame (`Arrow Right`)
  - Timecode display: `00:00:04:15 / 00:00:08:00` (`tabular-nums`)
  - Volume slider and Mute toggle
  - Playback speed selector (`0.5x`, `1x`, `1.5x`, `2x`)

### 6.4 Right Inspector Panel (320px)
Context-sensitive based on active selection:
- **Nothing Selected**: Project Settings (Title, Width, Height, FPS, Total Duration, Scene count).
- **Text Scene Selected**: Title, Subtitle, Text Color, Background Color, Animation Type (`fade`, `slide-up`, `typewriter`).
- **Formula Scene Selected**: LaTeX input box, Equation Title, Explanation text, Font Size slider + numeric input, Text color.
- **Video / Image Scene Selected**: Source path, Start frame, Duration, Object fit (`cover`, `contain`), Volume, Playback rate.
- **Audio Track Selected**: Track ID, Audio type (`voice`, `music`, `sfx`), Volume (0–100%), Fade In frames, Fade Out frames, Loop toggle.
- **All Sections**: Structured collapsible accordions with standardized 32px inputs and 80px label widths.

---

## 7. Timeline Architecture & Interaction Ergonomics

### 7.1 Geometry & Units
- Canonical editing unit: **Frames** (integers).
- Scaling metric: `pixelsPerSecond` (default `100px/s`, zoom range `20px/s` to `500px/s`).
- Formula:
  $$\text{clipWidthPx} = \frac{\text{durationInFrames}}{\text{fps}} \times \text{pixelsPerSecond}$$
  $$\text{clipLeftPx} = \frac{\text{startFrame}}{\text{fps}} \times \text{pixelsPerSecond}$$

### 7.2 Track Structure
- **V2 (Overlays / Text / Formulas)**: 52px height.
- **V1 (Primary Video & Image Scenes)**: 52px height.
- **A1 (Voice / Dialogue)**: 52px height.
- **A2 (Background Music / SFX)**: 52px height.
- **Track Headers (200px sticky left)**: Track label (`V1`, `A1`), name, Visibility toggle (eye icon), Mute toggle (speaker icon), Lock toggle (lock icon).

### 7.3 Timeline Ruler (28px sticky top)
- Adaptive major timecode ticks (`00:00`, `00:02`, `00:04` or frame-level depending on zoom).
- Clicking or dragging on the ruler seeks the playhead instantly.

### 7.4 Playhead
- 2px vertical line in semantic color `--playhead` (`#FF5D73`).
- Top triangular grab handle extending through ruler and all tracks.
- Uses HTML pointer capture (`setPointerCapture`) for smooth scrubbing outside timeline bounds.

### 7.5 Clip Interaction States
- **Default**: Base media color family, 1px subtle border.
- **Hover**: Cursor changes to `grab` over clip body, or `ew-resize` over left/right 8px trim handles.
- **Selected**: 2px accent border (`--accent: #5B8CFF`), elevated z-index (20).
- **Dragging**: Cursor `grabbing`, opacity `0.75`, ghost preview at target time.
- **Trimming**: Left/right edge drag adjusts `startFrame` or `durationInFrames`. Floating tooltip displays exact delta and new duration: `Duration: 03.50s (105f)`.
- **Snapping**: Snaps to playhead, clip start/end, and 0s within a 6px threshold. Displays a vertical blue guideline (`--snap-guide`) while snap is active.

---

## 8. State Architecture & Single Source of Truth

Centralized state management (`src/editor/state/editorStore.ts`):
- `project`: Current `VideoProject` declarative tree.
- `timeline`: Computed timeline boundaries generated via `buildTimeline(project)`.
- `currentFrame`: Global playhead frame index.
- `isPlaying`: Playback state boolean.
- `selectedClipId`: ID of the currently focused clip (or `null`).
- `zoom`: Horizontal zoom level (`pixelsPerSecond`).
- `scrollLeft`, `scrollTop`: Synchronized timeline viewport coordinates.
- `snappingEnabled`: Snapping toggle boolean.
- `history`: Undo/Redo stack storing immutable project snapshots.

---

## 9. Keyboard Shortcuts & Focus Guards

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `Space` | Play / Pause | Toggles player playback. |
| `Delete` / `Backspace` | Delete Clip | Removes selected clip from timeline. |
| `Ctrl + Z` / `Cmd + Z` | Undo | Reverts last state change. |
| `Ctrl + Shift + Z` | Redo | Reapplies reverted change. |
| `Ctrl + S` / `Cmd + S` | Save | Emits project state save. |
| `+` / `=` | Zoom In | Expands timeline scale around playhead. |
| `-` / `_` | Zoom Out | Compresses timeline scale. |
| `Arrow Left` | Step -1 Frame | Moves playhead back by 1 frame. |
| `Arrow Right` | Step +1 Frame | Moves playhead forward by 1 frame. |
| `Shift + Arrow Left` | Step -10 Frames | Moves playhead back by 10 frames (1/3 second). |
| `Shift + Arrow Right`| Step +10 Frames | Moves playhead forward by 10 frames. |
| `K` | Split / Cut | Splits selected clip at the current playhead frame. |

**Strict Focus Guard**:
All single-key shortcuts (`Space`, `Delete`, `+`, `-`, `Arrows`) are disabled whenever `document.activeElement` is an `input`, `textarea`, or content-editable field.

---

## 10. Performance & Accessibility Strategy

1. **Memoized Track & Clip Rendering**: Clips only re-render when their properties, selection state, or zoom level changes.
2. **Scrubbing Performance**: Playhead position updates avoid full React tree re-renders by using CSS transforms (`translateX`) and direct canvas player updates.
3. **Accessibility**:
   - WCAG AA contrast on all text elements against dark background.
   - Every icon button has an `aria-label` and custom tooltip.
   - Visible focus outlines (`2px solid var(--accent)`).
   - `prefers-reduced-motion` support.

---

## 11. Proposed Component Tree

```
EditorApp
└── EditorShell
    ├── GlobalCommandBar
    │   ├── Logo & ProjectName
    │   ├── HistoryControls (Undo / Redo)
    │   ├── StatusIndicator (Saved / Editing)
    │   └── ExportAction
    │
    ├── ResizableWorkspace (Horizontal split)
    │   ├── AssetPanel (Left resizable, 280px)
    │   │   ├── PanelHeader
    │   │   ├── AssetSearch
    │   │   ├── AssetTabs
    │   │   └── AssetList (Draggable AssetItem rows)
    │   │
    │   ├── PreviewWorkspace (Center flexible)
    │   │   ├── CanvasToolbar (Aspect ratio, Zoom, Safe Area, Guides)
    │   │   ├── PreviewCanvas (Fitted Remotion Player canvas)
    │   │   └── TransportControls (Timecode, Play/Pause, Step, Volume, Speed)
    │   │
    │   └── InspectorPanel (Right resizable, 320px)
    │       ├── PanelHeader
    │       └── InspectorSections (Project / Text / Formula / Media / Audio)
    │
    └── TimelineWorkspace (Bottom resizable, 320px)
        ├── TimelineToolbar (Select, Split, Delete, Snap, Zoom slider, Fit)
        └── Timeline
            ├── TimelineRuler (Timecode ticks & playhead handle)
            ├── TimelinePlayhead (Scrubbable 2px red line)
            ├── TimelineSnapGuide (Vertical guide line)
            └── TrackContainer (Synchronized scroll)
                ├── TrackHeaders (V2, V1, A1, A2 - sticky left)
                └── TrackLanes
                    └── TimelineClip (Trimmable, draggable, selectable)
```

---

## 12. File-by-File Plan

### Files to Create

| File | Action | Purpose & Problem Solved | Risk | Priority |
| :--- | :--- | :--- | :--- | :--- |
| `src/editor/tokens/colors.ts` | CREATE | Centralized dark-mode color tokens. Eliminates hardcoded hex values. | None | **CRITICAL** |
| `src/editor/tokens/typography.ts` | CREATE | Standardized typography tokens with tabular numbers for timecode. | None | **CRITICAL** |
| `src/editor/tokens/spacing.ts` | CREATE | 4px base grid spacing, control heights, z-index constants. | None | **CRITICAL** |
| `src/editor/tokens/editor.css` | CREATE | Global CSS variables and base styles scoped to the editor shell. | Low | **CRITICAL** |
| `src/editor/geometry/timelineGeometry.ts` | CREATE | Pure math for frame-to-pixel and pixel-to-frame conversions. | None | **CRITICAL** |
| `src/editor/geometry/timecode.ts` | CREATE | Standardized `HH:MM:SS:FF` formatter and parser. | None | **CRITICAL** |
| `src/editor/state/editorStore.ts` | CREATE | Centralized editor state (playhead, selection, zoom, undo/redo). | Low | **CRITICAL** |
| `src/editor/components/ui/Button.tsx` | CREATE | Standard enterprise buttons (sm, md, primary, secondary, ghost). | None | **CRITICAL** |
| `src/editor/components/ui/IconButton.tsx` | CREATE | 28px/32px square icon buttons with tooltip and aria-label. | None | **CRITICAL** |
| `src/editor/components/ui/Input.tsx` | CREATE | 32px height inputs with focus rings and tabular numbers. | None | **CRITICAL** |
| `src/editor/components/ui/Slider.tsx` | CREATE | Precise numeric sliders with value displays. | None | **IMPORTANT** |
| `src/editor/components/ui/Tooltip.tsx` | CREATE | Compact hover tooltips with keyboard shortcut displays. | None | **IMPORTANT** |
| `src/editor/components/shell/EditorShell.tsx` | CREATE | Main 3-column + bottom split layout container. | Low | **CRITICAL** |
| `src/editor/components/shell/CommandBar.tsx` | CREATE | 52px global top bar with project status and export action. | None | **CRITICAL** |
| `src/editor/components/shell/ResizablePanel.tsx` | CREATE | Panel container with draggable drag-handles and min/max clamps. | Low | **CRITICAL** |
| `src/editor/components/assets/AssetPanel.tsx` | CREATE | Left panel for browsing, searching, and dragging assets. | None | **CRITICAL** |
| `src/editor/components/preview/PreviewWorkspace.tsx`| CREATE | Center viewport embedding Remotion Player with zoom and transport. | Low | **CRITICAL** |
| `src/editor/components/preview/TransportControls.tsx`| CREATE | Play/pause, step frame, speed, volume, and timecode bar. | None | **CRITICAL** |
| `src/editor/components/inspector/InspectorPanel.tsx`| CREATE | Context-sensitive property editor for formulas, text, clips, audio. | None | **CRITICAL** |
| `src/editor/components/timeline/Timeline.tsx` | CREATE | Multi-track NLE timeline orchestrator. | Medium | **CRITICAL** |
| `src/editor/components/timeline/TimelineToolbar.tsx`| CREATE | Cut, delete, snap toggle, zoom slider, fit timeline. | None | **CRITICAL** |
| `src/editor/components/timeline/TimelineRuler.tsx` | CREATE | Timecode ruler with adaptive ticks and playhead scrubber. | Low | **CRITICAL** |
| `src/editor/components/timeline/TimelineTrack.tsx` | CREATE | Individual track lane holding clips. | Low | **CRITICAL** |
| `src/editor/components/timeline/TimelineTrackHeader.tsx`| CREATE | Sticky left header with V1/A1 labels and mute/hide toggles. | None | **CRITICAL** |
| `src/editor/components/timeline/TimelineClip.tsx` | CREATE | Interactive clip with selection, drag handle, and trim edges. | Medium | **CRITICAL** |
| `src/editor/components/timeline/TimelinePlayhead.tsx`| CREATE | 2px red playhead with pointer capture drag handle. | Low | **CRITICAL** |
| `src/editor/hooks/useKeyboardShortcuts.ts` | CREATE | Global keyboard shortcuts with active-input guards. | Low | **CRITICAL** |
| `src/editor/EditorApp.tsx` | CREATE | Root editor workspace combining shell, player, and timeline. | Low | **CRITICAL** |
| `index.html` | CREATE | Browser entry point for the desktop editor web application. | None | **CRITICAL** |
| `vite.config.ts` | CREATE | Lightning-fast Vite dev server config for the editor app. | Low | **CRITICAL** |

### Files to Modify

| File | Action | Why | Current Problem | Proposed Solution | Risk | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `package.json` | MODIFY | Add `@remotion/player` and `lucide-react` for UI player and icons, add `npm run edit` script. | Player package missing; no consistent icon set. | Add dependencies cleanly aligned with Remotion 4.x. | Low | **CRITICAL** |

### Files to Remove
- **None**. Existing render scripts, FFmpeg pipelines, domain models, and scene implementations will be 100% preserved.

---

## 13. Proposed Wireframe (1920 × 1080 Layout)

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🎬 ICEGOZI VIDEO   The Beauty of Mathematics  ● Saved            [🔍 Search / Commands (Ctrl+K)]     [↶] [↷]   [EXPORT VIDEO] │
├─────────────────────────┬───────────────────────────────────────────────────────────────────────────┬───────────────────────┤
│ ASSETS              [+] │ 16:9 (1920x1080)   Fit ▼   [Guides] [Safe Area]                       [⛶] │ INSPECTOR             │
│ [🔍 Search assets...  ] │ ┌───────────────────────────────────────────────────────────────────────┐ │ ▼ FORMULA PROPERTIES  │
│ [All] [Video] [Audio]   │ │                                                                       │ │ LaTeX:                │
│                         │ │                                                                       │ │ [ e^{i\pi} + 1 = 0  ] │
│ 📐 Euler's Identity     │ │                          e^{i\pi} + 1 = 0                             │ │                       │
│    Formula · 03.00s     │ │                                                                       │ │ Title:                │
│ 🎬 Intro Title          │ │                                                                       │ │ [ Euler's Identity  ] │
│    Text · 03.00s        │ │                                                                       │ │                       │
│ 🎬 Outro Card           │ │                                                                       │ │ Font Size: [ 72px ]   │
│    Text · 02.00s        │ └───────────────────────────────────────────────────────────────────────┘ │ Color:     [ #38BDF8] │
│ 🎵 Ambient BGM          │  ◀◀   ▶   ▶▶    00:00:03:15 / 00:00:08:00    🔊 [====]   1.0x ▼           │ ▼ TIMING              │
│    Audio · 08.00s       │                                                                           │ Start:     [ 90f    ] │
├─────────────────────────┴───────────────────────────────────────────────────────────────────────────┤ Duration:  [ 90f    ] │
│ [Select] [✂ Cut] [🗑 Delete]  │  [🧲 Snap: ON]  │  Zoom: [ - ] ━━━━━●━━━━━ [ + ]  [Fit Timeline]    │ ▼ TRANSITION          │
├─────────────────────────┬───────────────────────────────────────────────────────────────────────────┤ Type:      [ Fade ▼ ] │
│                         │ 00:00           00:02           00:04           00:06           00:08     │ Duration:  [ 15f    ] │
│ V2  Overlays   [👁][🔒] │                                 [ Euler's Identity (Formula) ]            │                       │
│ V1  Video      [👁][🔒] │ [ Intro Scene (Text) ] ═════════                                [ Outro ] │                       │
│ A1  Voice      [M][🔒]  │                                                                           │                       │
│ A2  Music      [M][🔒]  │ [========================== Ambient BGM ================================] │                       │
└─────────────────────────┴───────────────────────────────────────────────────────────────────────────┴───────────────────────┘
```

---

## 14. Phase 2 Implementation Sequence

```
Stage 1: Tooling & Design Tokens
         ├── Add @remotion/player & lucide-react to package.json
         ├── Implement tokens (colors.ts, typography.ts, spacing.ts, editor.css)
         └── Add geometry helpers (timelineGeometry.ts, timecode.ts)

Stage 2: Base UI Primitives
         ├── Button & IconButton
         ├── Input & NumericField
         ├── Slider, Tooltip, Dropdown

Stage 3: Editor Shell & Command Bar
         ├── ResizablePanel split system
         ├── EditorShell
         └── GlobalCommandBar (logo, title, undo/redo, status, export)

Stage 4: Center Preview Workspace
         ├── Embedded Remotion <Player> with MainVideo composition
         ├── CanvasToolbar (Aspect ratio, Zoom, Safe Area toggle)
         └── TransportControls (Timecode, Play/Pause, Step frame, Volume)

Stage 5: Left Asset Panel & Right Inspector
         ├── AssetPanel (Search, tabs, draggable asset list)
         └── InspectorPanel (Context-sensitive property forms)

Stage 6: Multi-Track NLE Timeline
         ├── TimelineToolbar (Cut, Delete, Snap, Zoom, Fit)
         ├── TimelineRuler (Adaptive timecode marks, click-to-seek)
         ├── TrackHeaders (V2, V1, A1, A2 - sticky left)
         ├── TimelinePlayhead (2px red line, scrubbing pointer capture)
         ├── TimelineClip (Selection, dragging, trimming with tooltips)
         └── Snapping Engine (Playhead, clip boundaries, snap guides)

Stage 7: Interaction & Keyboard Integration
         ├── useKeyboardShortcuts with active-input guards
         ├── Undo/Redo state integration
         └── Synchronized vertical & horizontal scrolling

Stage 8: Validation & Quality Gates
         ├── TypeScript typecheck
         ├── Unit tests for geometry and timecode
         ├── Visual consistency review (1920x1080, 1440x900)
         └── Remotion render compatibility verification
```

---

## 15. STOP RULE

Per Section 95 of the user request:
- **No UI code has been modified.**
- **No components have been altered.**
- **No dependencies have been installed.**
- **No CSS has been changed.**

The plan is complete, comprehensive, and ready for your review. Awaiting your explicit response:
**`OK triển khai`**
