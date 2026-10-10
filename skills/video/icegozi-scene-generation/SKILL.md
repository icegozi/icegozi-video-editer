---
name: icegozi-scene-generation
description: Create local images or vector animation scenes with the ICEGOZI core, or generate a Gemini image through the user's configured API key or official Google OAuth connection.
---

Read get_scene_generation_capabilities, get_project_context and
list_registered_assets. Parse every tool result with JSON.parse.

Gemini creates still images. Local core renders typed vector shapes, text and
keyframe motion without a cloud video service. Never describe a zoomed still as
real subject motion, or a vector fox as photorealistic footage. Explain the
available approach when the requested look requires capabilities not installed.

For core animation, read list_scene_templates. Pick an appropriate template or
compose a sceneSpec conforming to the returned schema. Use nested groups to
animate articulated subjects. Nodes/keyframes are data; never supply JSX,
JavaScript, URLs, external fonts or shell commands. For simple text animations,
prefer the existing text scene tools if no new media asset is required.

Call plan_scene_generation with the supported preset, kind, prompt, duration and
intent. Gemini referenceAssetIds must refer to ready images in this project's
manifest; include them only when the user requests using those references.
Call request_scene_generation to show the review card. Approval is the user's
decision. Report awaiting approval or the real job state, never a completed file
without a ready result. Do not poll repeatedly inside one Code Mode loop.

When the user chooses to build the ready asset into the timeline, read the fresh
snapshot and manifest, validate the candidate, then propose it. Keep locked
tracks, metadata, source duration and crossfade bounds intact. A generation
approval never applies a timeline change. Render only on an explicit request.

The Google / Gemini connection dialog configures a Gemini API key or a Desktop OAuth client and Cloud project;
sign-in is separate from API image entitlement and billing. Never request keys,
client secrets, access tokens or Gemini web cookies in chat. Never automatically
retry an image submission whose result or billing status is unknown.
