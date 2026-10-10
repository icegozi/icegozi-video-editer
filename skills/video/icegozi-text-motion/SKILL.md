---
name: icegozi-text-motion
description: Create animated titles, typography and letter zooms such as a small-to-large A using ICEGOZI's data-driven text scenes.
---

Read the installed text scene schema with `get_editor_capabilities` and the
current project with `get_project_context`. Text animation modes are `fade`,
`slide-up`, `typewriter` and `scale`. Choose the one matching the request.

For a small-to-large letter or title, use `animationType: "scale"`, `startScale`
and `endScale`, with `fontSize` in pixels. Scale interpolates across the scene's
own frame duration, including its first and last frame. Reverse the endpoints
for a shrink effect. Keep the final title inside the canvas's safe area.

Example scene for a five-second A at 30 FPS:

```json
{"id":"title-a","type":"text","title":"A","durationInFrames":150,"backgroundColor":"#000000","textColor":"#FFFFFF","animationType":"scale","fontSize":96,"startScale":0.25,"endScale":1.5}
```

Adapt duration to the actual FPS. Use this scene inside a full candidate project,
retaining required project fields and respecting locks. Validate then propose.
Use `formula` scenes for supplied LaTeX rather than unsupported text properties.
All animation uses validated data; no JSX or arbitrary executable code is needed.
