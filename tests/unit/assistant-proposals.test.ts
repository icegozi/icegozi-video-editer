import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createInitialState, editorReducer } from '../../src/editor/state/editorStore';
import { projectFingerprint, validateCandidate } from '../../src/application/assistant/projectProposals';
import { VideoProjectSchema } from '../../src/schemas/project.schema';
import type { ProjectProposal } from '../../src/shared/types/assistant';
import { mockProject } from '../fixtures/mock-project';

const epoch = randomUUID();
const proposal = (raw = mockProject): ProjectProposal => ({ id: randomUUID(), epoch, projectId: raw.id, baseRevision: 1,
  fingerprint: projectFingerprint(raw), summary: 'Rút scene đầu', affected: ['scene-1'], warnings: [],
  candidate: VideoProjectSchema.parse({ ...raw, title: 'AI title', scenes: raw.scenes.map((scene, index) => index ? scene : { ...scene, durationInFrames: 30 }) }),
});
const initial = () => ({ ...createInitialState(mockProject), assistantEpoch: epoch });

describe('AI project transactions', () => {
  it('applies atomically with one history entry, revision and dirty autosave status', () => {
    const before = { ...initial(), currentFrame: 9999 };
    const next = editorReducer(before, { type: 'APPLY_AI_PROJECT_CHANGE', proposal: proposal() });
    expect(next.project.title).toBe('AI title');
    expect(next.historyPast).toEqual([before.project]);
    expect(next.revision).toBe(2);
    expect(next.saveStatus).toBe('dirty');
    expect(next.currentFrame).toBeLessThan(next.timeline.totalDurationInFrames);
    const undo = editorReducer(next, { type: 'UNDO' });
    expect(undo.project).toEqual(before.project);
    expect(editorReducer(undo, { type: 'REDO' }).project).toEqual(next.project);
  });
  it('does not apply a proposal twice, including after undo', () => {
    const draft = proposal();
    const applied = editorReducer(initial(), { type: 'APPLY_AI_PROJECT_CHANGE', proposal: draft });
    const undone = editorReducer(applied, { type: 'UNDO' });
    const repeated = editorReducer({ ...undone, revision: 1 }, { type: 'APPLY_AI_PROJECT_CHANGE', proposal: draft });
    expect(repeated.project).toEqual(mockProject);
    expect(repeated.assistantApplyError).toContain('đã được');
  });
  it.each(['revision', 'fingerprint', 'project', 'epoch'])('rejects %s conflicts inside the reducer', (kind) => {
    const state = initial();
    if (kind === 'revision') state.revision++;
    if (kind === 'fingerprint') state.project = { ...state.project, title: 'Concurrent edit' };
    if (kind === 'project') state.project = { ...state.project, id: 'another-project' };
    if (kind === 'epoch') state.assistantEpoch = randomUUID();
    const next = editorReducer(state, { type: 'APPLY_AI_PROJECT_CHANGE', proposal: proposal() });
    expect(next.project).toBe(state.project);
    expect(next.historyPast).toHaveLength(0);
    expect(next.assistantApplyError).toBeTruthy();
  });
  it('rejects invalid schemas, cross-track duplicate IDs and invented media', () => {
    expect(() => validateCandidate(mockProject, { ...mockProject, scenes: [] })).toThrow();
    expect(() => validateCandidate(mockProject, { ...mockProject, audioTracks: [{ ...mockProject.audioTracks![0], id: 'scene-1' }] })).toThrow();
    expect(() => validateCandidate(mockProject, { ...mockProject, audioTracks: [{ ...mockProject.audioTracks![0], src: 'invented.mp3' }] })).toThrow();
    const crossfade = { ...mockProject, scenes: mockProject.scenes.map((scene, index) => index === 0 ? { ...scene, transition: { type: 'crossfade' as const, durationInFrames: 20 } } : index === 1 ? { ...scene, durationInFrames: 10 } : scene) };
    expect(() => validateCandidate(mockProject, crossfade)).toThrow('Crossfade');
  });
  it('protects locked tracks and downstream timing, including V1 fallback', () => {
    const locked = { ...mockProject, trackSettings: { V1: { locked: true } } };
    expect(() => validateCandidate(locked, proposal(locked).candidate)).toThrow('khóa');
    const audioLocked = { ...mockProject, trackSettings: { bgm: { locked: true } } };
    expect(() => validateCandidate(audioLocked, { ...audioLocked, audioTracks: [] })).toThrow('khóa');
    expect(() => validateCandidate(locked, { ...locked, trackSettings: {} })).toThrow('khóa');
  });
  it('canonical fingerprint ignores object key order and schemaVersion defaults', () => {
    expect(projectFingerprint(mockProject)).toBe(projectFingerprint(VideoProjectSchema.parse(mockProject)));
    const ordered = Object.fromEntries(Object.entries(mockProject).reverse()) as unknown as typeof mockProject;
    expect(projectFingerprint(ordered)).toBe(projectFingerprint(mockProject));
  });
});
