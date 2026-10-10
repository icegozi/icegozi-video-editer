---
name: icegozi-render-check
description: Request and monitor an approved preview of the current ICEGOZI project and report render evidence accurately.
---

Read the current snapshot before previewing. A pending draft is not the browser
project: ask the user to apply it first when the desired preview depends on it.
Check missing asset keys before creating work and explain absent media.

On an explicit preview request, call `render_project_preview`. For a final
export, call `render_project` with `profile: "final"`. Both require approval
and render the current snapshot. Wait for
its approval and retain the returned job ID. Use `get_render_status` for that
job; reuse it rather than starting duplicate jobs. Stop polling on completed,
failed or cancelled state. Never claim an MP4 is ready while a job is queued
or rendering. Report a failed job without inventing successful output.

A completed job with a download URL proves file generation. It does not prove
visual or audio quality. Ask the user to inspect framing, text readability,
media availability, caption timing and audio balance in the app's MP4 player.
Do not claim frame-by-frame visual inspection when no frame tool was used.
