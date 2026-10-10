# Local ChatGPT/Codex integration

This MVP is implemented for personal, noncommercial Windows use. It does not
establish approval to distribute a paid/hosted application or to use the
DevKit for business operations. The DevKit's Noncommercial License v1.0 is
included in `src/infrastructure/chatgpt/devkit/LICENSE`; its definition of
noncommercial excludes development/testing/operation for a business's advantage.
Reassess provider access and licensing before changing the distribution scope.

## Run

Use Windows, Node 24 (the SIWC DevKit requires Node >=22), FFmpeg/FFprobe, and:

```powershell
npm ci
npm run dev
```

Open **http://127.0.0.1:3200** and click **Trợ lý AI**. `localhost`, other
origins and LAN access are deliberately rejected. The Vite server provides
both the editor and the loopback bridge. `npm run build:editor` produces a
static frontend; serving `dist` alone does not supply authentication, chat or
render endpoints. No SaaS deployment or Electron/Tauri shell is included.

For a built local app use `npm run build:app` followed by `npm start`.
`npm run package:windows` creates a portable Windows folder under
`build/releases/` with `Start ICEGOZI.cmd`, Node 24, production dependencies,
the native SQLite module, Codex, its Code Mode host and Chrome Headless Shell. This uses the same
guarded HTTP/SSE handlers as dev, without Vite at runtime. `%LOCALAPPDATA%`
holds writable workspace data; account credentials and environment files are
never copied into a release. Source compositions remain available to the
bundled Remotion CLI, which is a production dependency. This is a portable
folder, not an Electron/Tauri installer.

Click **Continue with ChatGPT**, then the visible browser link. This is an
intentional manual browser launch: the callback listener is already running,
and no automatic browser-launch success is mistaken for authenticated access.
Consent belongs to the user. Account/workspace eligibility, granted scopes,
the authenticated model catalog, and successful terminal inference are
separate checks. No API-key fallback exists, and `.env.local` is not read by
this integration. Users buy/manage their own ChatGPT plan through OpenAI.

## Contracts and architecture

- React → same-origin HTTP/SSE → local Node → Codex app-server over stdio.
- Runtime: exact `@openai/codex@0.160.1`, resolved from the installed platform
  package. No PATH command or shell wrapper is executed. Native version is checked.
- SIWC: official DevKit local SDK source pinned to
  `0a36fefeb913055c8c7a1a29b63d82b96b2e841a`. `@siwc/local` is a private
  workspace in that repository, so it is vendored with notices, not assumed
  to be a public npm package. Node-only modifications are recorded in NOTICE.md.
- Per-installation host ID, per-registration verified identity/client mapping,
  PKCE/state/nonce transactions, signature/JWKS checks and locked atomic refresh
  are handled by the SDK. Only token-response granted scopes enable plan usage.
- Windows current-user DPAPI encrypts all saved credentials. Storage is under
  `%LOCALAPPDATA%/icegozi-video/assistant/auth`, outside the repository. Other OSes
  fail closed until a suitable encryption provider is supplied. Junctions and
  credential-file symlinks are rejected. Retained ID tokens are never sent to
  the renderer or placed in browser launch URLs; reauthorization uses the saved
  client and verifies the same subject.
- Codex receives only the OAuth access token in its own environment. Its home
  and cwd are isolated per registration/conversation outside the repository.
  Code Mode and its native host are enabled to dispatch `exec` calls to the
  app-owned video namespace. The adjacent `codex-code-mode-host` binary is
  required and checked before startup. Shell, plugins, apps, computer/browser
  tools and image viewing remain disabled. `environments: []` removes machine
  environments. `on-request`
  approvals remain enabled; unexpected native machine requests are declined.
  `untrusted` appears in some generated types but is rejected by this runtime.
- Ten namespace dynamic tools are registered with the generated contract:
  capabilities, skill discovery/loading, context, asset manifest, candidate
  validation, proposal, preview/final render requests and render status. These
  APIs are experimental and version pinned. Resume reuses persisted tools and
  environments; `thread/resume` has no `dynamicTools` field.
- The app owns seven small `SKILL.md` workflows under `skills/video/`. A base
  workflow and skill metadata are injected into developer instructions; full
  specialized content is loaded through a trusted-ID tool, not unrestricted
  filesystem access. The package includes these instructions. The runtime's
  Code Mode tool results are JSON strings; decode them before accessing fields.
  A tool-contract hash prevents resuming a thread with stale dynamic tools.
  UI history survives the refresh and recent messages remain project context.
- OpenAI tokens never enter browser DTOs, SSE, argv, agent context, repository,
  or diagnostics. Child environments are constructed from explicit allowlists.
  Raw runtime stderr is discarded. Remote errors have curated UI messages.
- A random app capability is injected only into the trusted local document.
  All bridge reads, writes and streams require it. Exact Host/Origin and
  Fetch Metadata checks reject other origins; no arbitrary RPC proxy exists.

## Editor behavior

The current browser project, revision, selection and playhead are submitted as
a validated snapshot. Arbitrary metadata is omitted from model context; media
bytes and repository contents are not uploaded. Filenames/subtitles are data.
MVP supports text/formula/image/video scenes; executable composition props and
generated JSX are excluded pending a separate sandbox design.
Text scenes additionally support bounded `fontSize`, `startScale`, `endScale`
and a `scale` animation calculated across each scene's own frame duration.
The capability tool exposes the strict editable project schema; candidate
validation returns field-level errors without creating a draft or render.

Drafts are created only by the typed proposal tool, not by extracting JSON
from prose. The bridge checks unique IDs, local assets, locks and domain rules.
The UI shows the candidate and warnings before applying. Backend reserve/lease/ack
prevents two tabs claiming the same proposal and retains drafts on stale applies. The reducer checks epoch,
project ID, revision, SHA-256 fingerprint and locks again at dispatch time.
A successful apply makes one undo entry, rebuilds the timeline, reconciles
selection/playhead, increments revision and enables existing autosave.
If an edit races the apply response, the reducer refuses it and the draft remains available for review or rebuilding.

Scene generation uses a local typed vector renderer and Gemini still-image API with API keys or official Google Desktop OAuth. Both authentication modes use profile-scoped Windows DPAPI storage; keys are submitted only by the backend in `x-goog-api-key`, while OAuth uses bearer/quota-project headers. Existing OAuth records remain compatible. Replacing/removing credentials invalidates old plans. The model has no access to connection-management endpoints, keys or tokens. Generation approvals and timeline apply approvals are independent; imported/generated assets require owner/project grants and file validation. See [SCENE_GENERATION.md](SCENE_GENERATION.md) for setup, usage, persistence, cancellation and fixture/live verification boundaries.

Preview uses an immutable snapshot through the existing Remotion service.
Asset real paths must remain within `public/assets`; originals are never changed.
Direct Node/argument-array execution replaces the Windows shell wrapper, and
preview honors the configured H.264/yuv420p output. A job's MP4 is exposed only
after completion and a nonempty output check, via a session-owned endpoint.
Render effects require either an explicit UI request or a separate tool approval
(five-minute expiry). Retries use receipts and do not create duplicate jobs.

SSE sends bounded, identified state snapshots. Reconnect replaces/deduplicates
UI state; it never resubmits a turn. Chats/thread metadata and render receipts
are persisted outside the repository. Process crashes/restarts mark unfinished
work interrupted; no inference/tool is replayed automatically. Profile changes
stop old work and rotate epochs while retaining isolated chat history. Logout
clears local credentials, old approvals/events and visible chat; the video
project is retained. Failed remote revocation is reported honestly with a
[ChatGPT Settings/Usage link](https://chatgpt.com/settings/usage).

Limits: 24 conversations, 200 messages/requests per conversation, 128 KB total
streamed chat text, 256 KB snapshots, 500 scenes/100 audio tracks/2000 subtitles,
four pending proposals, 20 preview jobs and 128 tool calls per turn. HTTP/RPC
messages are capped at 1 MB, replay at four state snapshots, RPC timeout at 30s,
login at 10 minutes, turn at 15 minutes, approval at five minutes, and SSE
connections recycle every five minutes with heartbeats. No estimated quotas,
prices or reset times are presented as provider data.

## Verification and live smoke test

```powershell
npm run typecheck
npm run test
npm run build:editor
npm run codex:check
npm run test:assistant-ui
```

`npm run test` uses synthetic credentials and fake RPC/network. The upstream
authorization/refresh/encrypted-storage tests and independently authored
lifecycle tests run with Node's test runner; other tests use Vitest. They do
not open a real login or consume inference quota. The Unix-only permission
test is skipped on Windows; Windows DPAPI and junction protection have their
own tests. UI verification uses Edge when installed (otherwise Playwright
Chromium); install a browser with `npx playwright install chromium` if needed.
It uses fixture login/inference but renders and plays a real local MP4.

`npm run codex:check` exercises the native executable's handshake, namespace
registration, explicit empty environments and orderly process restart without
an inference turn or real credential. **Real OAuth, plan entitlement, inference
and resume after inference remain unverified until the user performs this smoke
test:**

1. Launch the app; sign in using your own eligible account and explicitly grant
   plan use. Check the connected account and live model selector.
2. Choose a catalog model. Send a small request for a text scene adjustment.
   Check streamed output and the terminal completed state; apply the draft.
3. Undo/redo, render preview, and play the generated MP4. Request a second small
   turn to verify continuation. Refresh the page to verify restored metadata.
4. Stop a turn, switch a profile/project and log out. Check that old work cannot
   affect the new project and that tokens remain in DPAPI-protected local storage.

`npm run codex:check-tools` additionally runs a native turn against a loopback
synthetic Responses server: `exec` dispatches through the bundled Code Mode
host to the actual app dispatcher, reads capabilities and the bundled text
motion skill, validates a candidate and creates a growing-A draft. It completes
the turn without automatically applying or rendering that draft. This verifies
actual tool execution, not account entitlement or live
model inference. The packaged folder contains the compiled equivalent at
`build/check-code-mode.mjs`, runnable with its own `runtime/node.exe`.

Record only runtime/OS/auth route/model and observed terminal status. An empty
thread created without a turn may not be resumable; the native no-inference
check intentionally does not claim successful resume or account access.

## Official sources reviewed on 2026-10-10

- [App-server](https://learn.chatgpt.com/docs/app-server)
- [SIWC quickstart](https://developers.openai.com/siwc/quickstart)
- [Local app cookbook](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt)
- [Registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in)
- [Accounts and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions)
- [Models and inference](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference)
- [SIWC app-server provider](https://developers.openai.com/siwc/token-sharing-open-source/codex-app-server)
- [Preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations)
- [DevKit source/licensing](https://github.com/openai/sign-in-with-chatgpt-devkit)

## Verification results and review

Environment: Windows, Node 24.11.0, Codex 0.160.1, Edge headless UI,
Remotion 4.0.534 and local FFmpeg. No real ChatGPT account was authenticated.

| Scenario | Method | Expected | Observed | Status |
|---|---|---|---|---|
| Type safety | `npm run typecheck` | No errors | No errors | PASS |
| Protocol, transactions, isolation, render and regression | Vitest | Required boundaries pass | 96 tests pass | PASS |
| OAuth, refresh, encrypted storage | Node fixtures | No real secret/network inference | 41 pass, one Unix-only test skipped on Windows | PASS |
| Windows credential protection | Vitest + real DPAPI/junction | Encrypt/decrypt; reject junction | Both pass | PASS |
| Editor build | `npm run build:editor` | Build succeeds | Build succeeds; existing bundle-size/Zod annotation warnings | PASS |
| Native runtime | `npm run codex:check` | Handshake, namespace tools, empty environments, orderly restart | Observed with native executable; no turn/inference | PASS |
| UI and local preview | `npm run test:assistant-ui` | Fixture login/chat, apply/undo/redo, autosave/refresh, MP4 decode, logout, three viewports | Passed at 1440/768/390px with real local MP4; no page errors | PASS |
| Local HTTP protection | Headless UI/API test | Invalid Host/Origin/capability rejected; no RPC proxy | 403/404 as expected; no synthetic token in status | PASS |
| Live SIWC/model inference/resume | User smoke test | Own account grants permission and completes a real turn | Requires user sign-in/consent; not performed | NOT TESTED |

Review scope: feature files, relevant committed changes since `6c1b419`,
current tracked/untracked feature changes and render integration. Branch is
`master`; no separate integration branch exists. Concurrent UI/state/theme
changes were preserved. This task did not run commit, push or merge commands.

| Severity | Finding | Minimal fix | Status |
|---|---|---|---|
| CRITICAL | Native runtime rejects deprecated `untrusted` setting | Use `on-request`; retain empty machine environments and decline native effects | FIXED |
| IMPORTANT | Immediate restart races native runtime SQLite files | Await owned-process close; isolate homes per conversation | FIXED |
| IMPORTANT | Reconnecting the same profile could retain an old browser epoch | Bridge epoch rotation, owner checks after awaits and stale-turn filtering | FIXED |
| IMPORTANT | Two tabs could claim a proposal independently | Backend proposal consumption plus reducer identity/revision/fingerprint recheck | FIXED |
| IMPORTANT | Proposal shortening could make a crossfade outlast the next scene | Reject crossfades longer than either adjacent scene before apply | FIXED |
| IMPORTANT | Chat content overlapped Apply controls | Scrollable history and fixed form/header sizing; verify actual clicks | FIXED |
| IMPORTANT | Windows shell-based rendering inherited full environment | Direct Node argv, filtered environment, configured codec/pixel format | FIXED |
| IMPORTANT | Live provider access and resume after real inference unproven | Follow the user-owned smoke test above | OPEN |

`npm audit` reports seven existing development-tooling advisories (five
moderate, two critical), including Vitest/tinypool and drizzle-kit/esbuild.
They are not new SIWC/Codex runtime dependencies. Dependency remediation is
outside this feature patch and remains a separate review item.

**Merge gate: NOT READY TO MERGE** for full live-integration acceptance until
the user-owned SIWC/inference/resume smoke test is performed and outstanding
dependency advisories are assessed. The automated and fixture-tested local
implementation is available for that verification.
