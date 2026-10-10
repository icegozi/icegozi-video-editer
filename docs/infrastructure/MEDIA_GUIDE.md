# Technical Media Specifications & Media Guide

This guide establishes the media formatting standards, audio policies, and file organization rules for the `icegozi_video` pipeline.

---

## 1. Golden Media Standard

To ensure glitch-free rendering, zero frame drops, and uniform audio levels across scenes, all source footage processed through the pipeline should adhere to the Golden Standard:

| Property | Standard Value | Description |
| :--- | :--- | :--- |
| **Resolution** | `1920x1080` | Full HD 16:9 widescreen canvas |
| **Framerate** | `30.00 fps` | Constant Framerate (CFR). Avoid Variable Framerate (VFR). |
| **Video Codec** | `H.264 (AVC)` | High profile, Level 4.2 |
| **Pixel Format** | `yuv420p` | Maximum compatibility for browser canvas rendering |
| **Audio Codec** | `AAC-LC` | Advanced Audio Coding |
| **Sample Rate** | `48,000 Hz` | Standard professional broadcast audio |
| **Audio Channels**| `Stereo (2.0)`| Standard left/right channels |
| **Audio Bitrate** | `320 kbps` | High fidelity |

---

## 2. Directory Governance

```
public/assets/          <-- Strictly READ-ONLY for automated scripts
  ├── video/            <-- Raw video clips
  ├── audio/            <-- Music, voice-over, sound effects
  ├── images/           <-- Backgrounds, overlays, diagrams
  ├── fonts/            <-- Custom fonts
  └── subtitles/        <-- WebVTT or SRT files

generated/              <-- Intermediate work products (SAFE TO DELETE)
  ├── normalized/       <-- Transcoded clips adhering to Golden Standard
  ├── frames/           <-- Extracted reference frames (PNG)
  ├── previews/         <-- Draft render exports
  └── temp/             <-- Temporary concat manifests and scratch files

output/                 <-- Final production render exports
```

---

## 3. Normalization Rule

When source media deviates from the Golden Standard:
- **Never overwrite raw assets in `public/assets/`**.
- Transcode through the normalization engine:
  ```bash
  npm run media:normalize <path-to-raw-media>
  ```
- The resulting clip is written to `generated/normalized/<name>_normalized.mp4`.
- The normalization filter scales with aspect ratio preservation and pads with black pillarbox/letterbox if needed:
  ```
  scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p
  ```

---

## 4. Audio Loudness Standards

- Voice-over audio target: **-16 LUFS** (integrated loudness) with -1.5 dB true peak.
- Background music target: **-24 LUFS** or dynamically attenuated when voice is active.
- To normalize audio loudness:
  ```bash
  npx tsx -e "import { FfmpegClient, buildNormalizeAudioCommand } from './src/infrastructure/ffmpeg/index.ts'; FfmpegClient.execute(buildNormalizeAudioCommand({ inputPath: 'input.wav', outputPath: 'output.aac' }))"
  ```
