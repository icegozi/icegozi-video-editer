---
name: icegozi-timeline-edit
description: Trim, reorder, retime or transition scenes and align existing media tracks in an ICEGOZI project.
---

Read the fresh snapshot and capability schema. Identify scenes by ID and the
user's selection; make the smallest requested edit. Preserve unrelated scenes,
audio, captions, canvas settings and metadata. Locked tracks cannot be changed.

Scenes play sequentially. A crossfade on a scene overlaps it with the next
scene by `transition.durationInFrames`, so total runtime is the sum of scene
durations minus those overlaps. Combined incoming and outgoing overlaps must
fit inside each scene. Avoid an outgoing transition on the final scene.

Video trims use `startFromFrame`; account for `playbackRate` when preserving
the source offset during a split. Keep a split clip's outgoing transition on
the second half. New IDs must be unique across scenes, audio tracks and cues.
Explain meaningful timing changes before proposing the candidate.

Run `validate_project_change` and fix its errors. Do not silently unlock tracks
or substitute unrelated media to make an edit pass validation.
