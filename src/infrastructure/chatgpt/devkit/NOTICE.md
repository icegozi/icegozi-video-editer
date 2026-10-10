Vendored from https://github.com/openai/sign-in-with-chatgpt-devkit
Commit: 0a36fefeb913055c8c7a1a29b63d82b96b2e841a (2026-10-10).
Upstream packages/local is a private workspace, not a public npm dependency.
OpenAI code retains the accompanying Noncommercial License v1.0.

Modifications (2026-10-10): index.ts/types.ts add a Node-only authenticated
credential accessor for Codex app-server and guard its returned token by epoch.
All modifications to these files are under the same license.
storage.ts also rejects symlink/junction ancestors and credential-file symlinks
on Windows before reads; original files remain intact on rejection.
No upstream React components or fonts are included.
