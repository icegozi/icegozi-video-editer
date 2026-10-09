Vendored from https://github.com/openai/sign-in-with-chatgpt-devkit
Commit: 0a36fefeb913055c8c7a1a29b63d82b96b2e841a (2026-10-10).
Upstream packages/local is a private workspace, not a public npm dependency.
OpenAI code retains the accompanying Noncommercial License v1.0.

Modifications (2026-10-10): index.ts/types.ts add a Node-only authenticated
credential accessor for Codex app-server; oauth.ts omits the optional ID-token
URL hint to keep retained credentials out of renderer DTOs and browser URLs.
All modifications to these files are under the same license.
No upstream React components or fonts are included.
