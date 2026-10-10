# Media Processing & Editing Workflow Guide

This document describes the operational workflows for editing videos using the `icegozi_video` pipeline.

---

## 1. Standard Production Video Workflow

```
RAW SOURCE ASSET (public/assets/)
        │
        ▼
1. INSPECT MEDIA (`npm run media:inspect <file>`)
        │
        ▼
2. VALIDATE PROJECT ASSETS (`npm run media:validate`)
        │
        ▼
3. NORMALIZE IF REQUIRED (`npm run media:normalize <file>`)
   (Transcodes to standard 1080p H.264 into generated/normalized/)
        │
        ▼
4. COMPOSE VIDEO PROJECT (`projects/[project-name]/project.ts`)
   (Define scenes, durations, formulas, text overlays, transitions)
        │
        ▼
5. INTERACTIVE STUDIO PREVIEW (`npm run studio`)
   (Review in browser with live timeline scrubbing)
        │
        ▼
6. FAST PREVIEW RENDER (`npm run render:preview`)
   (Fast 720p draft export into generated/previews/)
        │
        ▼
7. FINAL PRODUCTION RENDER (`npm run render`)
   (Full 1080p CRF 18 production export into output/)
```

---

## 2. AI-Generated Video Workflow (e.g. Veo, Runway, Luma)

When working with AI-generated video clips:

1. **Store Original:** Place raw AI generation exports in `public/assets/video/ai_raw/`. Never overwrite or edit these directly.
2. **Inspect:** Run `npm run media:inspect public/assets/video/ai_raw/my_clip.mp4` to inspect codec, resolution, and variable framerates.
3. **Normalize:** Run `npm run media:normalize public/assets/video/ai_raw/my_clip.mp4`. This converts the clip to constant 30fps, 1080p H.264 into `generated/normalized/`.
4. **Extract Transition Frames:** If generating subsequent continuations:
   ```bash
   npx tsx scripts/extract-frame.ts generated/normalized/my_clip_normalized.mp4 4.0
   ```
   This extracts the final frame at timestamp 4.0s as a high-resolution PNG in `generated/frames/` to use as the image prompt for the next AI clip.
5. **Compose & Assemble:** Reference the normalized video in your project scene:
   ```ts
   {
     id: 'ai-scene-1',
     type: 'video',
     src: 'generated/normalized/my_clip_normalized.mp4',
     durationInFrames: 120,
   }
   ```
6. **Render:** Preview in Remotion Studio and export the final video.
