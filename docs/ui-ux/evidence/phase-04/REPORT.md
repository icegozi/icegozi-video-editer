# Phase 04 — Evidence Report: AI Workspace and Proposal UX (UI-08, UI-09)

- **Date/time:** 2026-10-10 10:51:00+07:00
- **Git branch:** master
- **Before SHA:** 2c4543a
- **After SHA:** (to be recorded after local commit)
- **Scope / Patch IDs:** UI-08, UI-09
- **Touched paths:**
  - `src/editor/components/chat/PromptComposer.tsx`
  - `src/editor/components/chat/ProposalCard.tsx`
  - `src/editor/components/chat/AiChatPanel.tsx`
  - `src/editor/components/chat/ContextChipsBar.tsx`
  - `tests/integration/ai-workflow.test.ts`
  - `scripts/capture-phase04.ts`
  - `docs/ui-ux/evidence/phase-04/screenshots/`
  - `docs/ui-ux/evidence/phase-04/VERIFICATION.json`

## Changes and Rationale
1. **PromptComposer:** Enforced Vietnamese IME composition guard (`isComposing || keyCode === 229`), Enter to submit and Shift+Enter for multiline newline, tokenized send/cancel button colors (`--color-primary`, `--color-danger`).
2. **ProposalCard:** Standardized proposal diff card using Luminous tokens (`--color-surface`, `--color-primary-subtle`, `--color-success`, `--font-mono`), progressive disclosure snapshot preview toggle, and explicit "Duyệt & Áp dụng" (Apply) / "Bỏ qua" (Dismiss) buttons.
3. **AiChatPanel & ContextChipsBar:** Updated empty state template cards and chat bubble styles to canonical Luminous tokens (`--color-primary`, `--color-app-bg`, `--color-text-primary`, `--color-text-secondary`).
4. **Real Application-Handler Verification (F4):** Created dedicated test suite `tests/integration/ai-workflow.test.ts` testing actual `APPLY_AI_PROJECT_CHANGE` reducer transitions, epoch/revision/fingerprint checks, duplicate apply rejection, exactly one undo step, and workspace mode draft retention.

## Commands Actually Executed
1. `npm run typecheck`: Exit code 0, 0 errors.
2. `npm test`: Exit code 0, 171 vitest tests passed (including 7 new ai-workflow tests) + 41 siwc-devkit check tests passed.
3. `npm run build:editor`: Exit code 0, built in 8.55s.
4. `npx tsx scripts/capture-phase04.ts`: Exit code 0, captured 4 screenshots across viewports.

## Verification Gate & Screenshots
- `docs/ui-ux/evidence/phase-04/screenshots/phase04_ai_workspace_1366x768.png`
- `docs/ui-ux/evidence/phase-04/screenshots/phase04_ai_with_context_1366x768.png`
- `docs/ui-ux/evidence/phase-04/screenshots/phase04_ai_workspace_1920x1080.png`
- `docs/ui-ux/evidence/phase-04/screenshots/phase04_ai_with_context_1920x1080.png`

## Risk Check
- **AI Safety & Permissions:** AI modifications strictly require human-in-the-loop approval. Proposals are immutable until explicitly applied via `APPLY_AI_PROJECT_CHANGE`.
- **SIWC & Auth:** ChatGPT sign-in and DPAPI credential protection remain untouched and operational.
- **Undo History:** Exactly one undo entry is pushed per applied proposal, allowing seamless 1-click `Ctrl+Z` recovery.

## Phase Status & Commit Eligibility
- **Phase Final Status:** `DONE`
- **Commit Eligibility:** `true`
- **Suggested Commit Message:** `feat(ui): unify ai chat and proposal workflow`
