---
name: icegozi-audio-captions
description: Arrange imported narration, music, sound effects and timed subtitle cues in an ICEGOZI video.
---

Inspect project context, asset keys and the installed schema. Use existing local
audio; `voice`, `music` and `sfx` are track roles, not audio generators. Do not
claim speech was transcribed or synthesized without an available tool result.
Ask for a transcript or imported audio when the requested workflow needs it.

Audio `startFrame`, `durationInFrames`, `fadeInFrames` and `fadeOutFrames` use
project frames. Volume is 0..1; choose readable narration over the music bed.
Use looping only for a suitable supplied track and keep fades within its used
duration. Do not modify locked audio or caption tracks.

Subtitle `startMs` and `endMs` use milliseconds. Preserve the supplied wording
unless editing or translation is requested, and group cues into short readable
phrases. Every cue needs a unique ID and a later end time. Keep cues aligned
with supplied timing; do not fabricate exact timestamps from a filename.

Validate and propose the project. State any material timing assumptions and
what the user needs to check in the preview.
