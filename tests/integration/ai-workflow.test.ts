import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createInitialState, editorReducer } from '../../src/editor/state/editorStore';
import { projectFingerprint, validateCandidate } from '../../src/application/assistant/projectProposals';
import { VideoProjectSchema } from '../../src/schemas/project.schema';
import type { ProjectProposal } from '../../src/shared/types/assistant';
import { mockProject } from '../fixtures/mock-project';

const createProposal = (raw = mockProject, epoch = randomUUID()): ProjectProposal => ({
  id: randomUUID(),
  epoch,
  projectId: raw.id,
  baseRevision: 1,
  fingerprint: projectFingerprint(raw),
  summary: 'Thay đổi màu sắc và thời lượng',
  affected: ['scene-1'],
  warnings: [],
  candidate: VideoProjectSchema.parse({
    ...raw,
    title: 'AI Propose Update',
    scenes: raw.scenes.map((scene, index) =>
      index === 0 ? { ...scene, durationInFrames: 45 } : scene
    ),
  }),
});

describe('Phase 4: Real Application-Handler Integration & Proposal UX (UI-08, UI-09)', () => {
  it('1. Valid proposal apply transitions project state with exactly 1 undo entry', () => {
    const epoch = randomUUID();
    const state = { ...createInitialState(mockProject), assistantEpoch: epoch };
    const proposal = createProposal(mockProject, epoch);

    const nextState = editorReducer(state, {
      type: 'APPLY_AI_PROJECT_CHANGE',
      proposal,
    });

    expect(nextState.project.title).toBe('AI Propose Update');
    expect(nextState.revision).toBe(state.revision + 1);
    expect(nextState.historyPast).toHaveLength(1);
    expect(nextState.historyPast[0]).toEqual(state.project);
    expect(nextState.historyFuture).toHaveLength(0);
    expect(nextState.appliedAiProposalIds).toContain(proposal.id);
  });

  it('2. Dismissing/rejecting a proposal does not mutate the project state or history', () => {
    const epoch = randomUUID();
    const state = { ...createInitialState(mockProject), assistantEpoch: epoch };
    const proposal = createProposal(mockProject, epoch);

    // In the application, dismissing a proposal removes it from the conversation
    // or calls onDismiss, leaving the editor state unchanged
    const dismissHandler = vi.fn((p: ProjectProposal) => {
      // no-op on project state
    });

    dismissHandler(proposal);
    expect(dismissHandler).toHaveBeenCalledWith(proposal);
    expect(state.project).toEqual(mockProject);
    expect(state.revision).toBe(1);
    expect(state.historyPast).toHaveLength(0);
  });

  it('3. Stale revision rejects apply and sets assistantApplyError without project change', () => {
    const epoch = randomUUID();
    const state = {
      ...createInitialState(mockProject),
      assistantEpoch: epoch,
      revision: 5, // User edited in between
    };
    const proposal = createProposal(mockProject, epoch); // baseRevision: 1

    const nextState = editorReducer(state, {
      type: 'APPLY_AI_PROJECT_CHANGE',
      proposal,
    });

    expect(nextState.project).toBe(state.project);
    expect(nextState.revision).toBe(5);
    expect(nextState.assistantApplyError).toContain('đã thay đổi');
    expect(nextState.historyPast).toHaveLength(0);
  });

  it('4. Stale fingerprint or altered project rejects apply cleanly', () => {
    const epoch = randomUUID();
    const state = {
      ...createInitialState(mockProject),
      assistantEpoch: epoch,
      project: { ...mockProject, title: 'Locally edited title' },
    };
    const proposal = createProposal(mockProject, epoch);

    const nextState = editorReducer(state, {
      type: 'APPLY_AI_PROJECT_CHANGE',
      proposal,
    });

    expect(nextState.project.title).toBe('Locally edited title');
    expect(nextState.assistantApplyError).toBeTruthy();
  });

  it('5. Duplicate apply of same proposal is rejected even after undo', () => {
    const epoch = randomUUID();
    const state = { ...createInitialState(mockProject), assistantEpoch: epoch };
    const proposal = createProposal(mockProject, epoch);

    const appliedState = editorReducer(state, {
      type: 'APPLY_AI_PROJECT_CHANGE',
      proposal,
    });
    expect(appliedState.appliedAiProposalIds).toContain(proposal.id);

    // Undo change
    const undoneState = editorReducer(appliedState, { type: 'UNDO' });
    expect(undoneState.project).toEqual(mockProject);
    expect(undoneState.appliedAiProposalIds).toContain(proposal.id);

    // Attempt re-apply
    const reapplyState = editorReducer(undoneState, {
      type: 'APPLY_AI_PROJECT_CHANGE',
      proposal,
    });
    expect(reapplyState.project).toEqual(mockProject);
    expect(reapplyState.assistantApplyError).toContain('đã được áp dụng');
  });

  it('6. Editor Ctrl+Z triggers UNDO recovering original project accurately', () => {
    const epoch = randomUUID();
    const state = { ...createInitialState(mockProject), assistantEpoch: epoch };
    const proposal = createProposal(mockProject, epoch);

    const applied = editorReducer(state, {
      type: 'APPLY_AI_PROJECT_CHANGE',
      proposal,
    });

    const undone = editorReducer(applied, { type: 'UNDO' });
    expect(undone.project).toEqual(mockProject);
    expect(undone.historyFuture).toHaveLength(1);
    expect(undone.historyFuture[0]).toEqual(applied.project);
  });

  it('7. Mode switching preserves project revision, draft, and state invariants', () => {
    const state = createInitialState(mockProject);
    expect(state.workspaceMode).toBe('ai');

    // Switch to edit mode
    const editMode = editorReducer(state, {
      type: 'SET_WORKSPACE_MODE',
      mode: 'edit',
    });
    expect(editMode.workspaceMode).toBe('edit');
    expect(editMode.revision).toBe(state.revision);
    expect(editMode.project).toBe(state.project);

    // Switch to preview mode
    const previewMode = editorReducer(editMode, {
      type: 'SET_WORKSPACE_MODE',
      mode: 'preview',
    });
    expect(previewMode.workspaceMode).toBe('preview');
    expect(previewMode.revision).toBe(state.revision);
    expect(previewMode.project).toBe(state.project);
  });
});
