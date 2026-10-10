import { describe, it, expect } from 'vitest';
import {
  editorReducer,
  createInitialState,
  EditorAction,
} from '../../src/editor/state/editorStore';
import { demoProject } from '../../projects/demo/project';

describe('Editor Workspace Modes & Layout States (Redesign Requirements)', () => {
  it('initializes with AI Focus mode by default', () => {
    const state = createInitialState(demoProject);

    expect(state.workspaceMode).toBe('ai');
    expect(state.activeLeftTab).toBe('ai');
    expect(state.isInspectorOpen).toBe(false);
    expect(state.isTimelineCollapsed).toBe(false);
  });

  it('switches between workspace modes correctly', () => {
    let state = createInitialState(demoProject);

    // Switch to edit mode
    state = editorReducer(state, { type: 'SET_WORKSPACE_MODE', mode: 'edit' });
    expect(state.workspaceMode).toBe('edit');
    expect(state.isInspectorOpen).toBe(true);
    expect(state.isTimelineCollapsed).toBe(false);

    // Switch to preview mode
    state = editorReducer(state, { type: 'SET_WORKSPACE_MODE', mode: 'preview' });
    expect(state.workspaceMode).toBe('preview');
    expect(state.isInspectorOpen).toBe(false);
    expect(state.isTimelineCollapsed).toBe(true);

    // Switch back to AI focus mode
    state = editorReducer(state, { type: 'SET_WORKSPACE_MODE', mode: 'ai' });
    expect(state.workspaceMode).toBe('ai');
    expect(state.activeLeftTab).toBe('ai');
    expect(state.isInspectorOpen).toBe(false);
    expect(state.isTimelineCollapsed).toBe(false);
  });

  it('toggles inspector and timeline collapse independently', () => {
    let state = createInitialState(demoProject);

    // Toggle inspector
    expect(state.isInspectorOpen).toBe(false);
    state = editorReducer(state, { type: 'TOGGLE_INSPECTOR' });
    expect(state.isInspectorOpen).toBe(true);
    state = editorReducer(state, { type: 'SET_INSPECTOR_OPEN', open: false });
    expect(state.isInspectorOpen).toBe(false);

    // Toggle timeline collapse
    expect(state.isTimelineCollapsed).toBe(false);
    state = editorReducer(state, { type: 'TOGGLE_TIMELINE_COLLAPSE' });
    expect(state.isTimelineCollapsed).toBe(true);
    state = editorReducer(state, { type: 'SET_TIMELINE_COLLAPSED', collapsed: false });
    expect(state.isTimelineCollapsed).toBe(false);
  });

  it('switches left workspace tabs between AI Studio and Assets', () => {
    let state = createInitialState(demoProject);

    expect(state.activeLeftTab).toBe('ai');
    state = editorReducer(state, { type: 'SET_ACTIVE_LEFT_TAB', tab: 'assets' });
    expect(state.activeLeftTab).toBe('assets');
    state = editorReducer(state, { type: 'SET_ACTIVE_LEFT_TAB', tab: 'ai' });
    expect(state.activeLeftTab).toBe('ai');
  });

  it('opens inspector automatically when a clip is selected', () => {
    let state = createInitialState(demoProject);
    state = editorReducer(state, { type: 'SET_INSPECTOR_OPEN', open: false });
    expect(state.isInspectorOpen).toBe(false);

    const firstSceneId = demoProject.scenes[0].id;
    state = editorReducer(state, { type: 'SET_SELECTED_CLIP', clipId: firstSceneId });

    expect(state.selectedClipId).toBe(firstSceneId);
    expect(state.isInspectorOpen).toBe(true);
  });

  it('strictly preserves project reference, revision, frame, and undo history across mode switches', () => {
    let state = createInitialState(demoProject);
    state = {
      ...state,
      currentFrame: 45,
      selectedClipId: demoProject.scenes[0].id,
      revision: 4,
      historyPast: [demoProject],
      saveStatus: 'saved',
    };

    const initialProject = state.project;
    const initialRevision = state.revision;
    const initialFrame = state.currentFrame;
    const initialSelection = state.selectedClipId;
    const initialHistoryLength = state.historyPast.length;

    // Switch to Edit Focus
    state = editorReducer(state, { type: 'SET_WORKSPACE_MODE', mode: 'edit' });
    expect(state.project).toBe(initialProject);
    expect(state.revision).toBe(initialRevision);
    expect(state.currentFrame).toBe(initialFrame);
    expect(state.selectedClipId).toBe(initialSelection);
    expect(state.historyPast.length).toBe(initialHistoryLength);

    // Switch to Preview Focus
    state = editorReducer(state, { type: 'SET_WORKSPACE_MODE', mode: 'preview' });
    expect(state.project).toBe(initialProject);
    expect(state.revision).toBe(initialRevision);
    expect(state.currentFrame).toBe(initialFrame);
    expect(state.selectedClipId).toBe(initialSelection);
    expect(state.historyPast.length).toBe(initialHistoryLength);

    // Switch back to AI Focus
    state = editorReducer(state, { type: 'SET_WORKSPACE_MODE', mode: 'ai' });
    expect(state.project).toBe(initialProject);
    expect(state.revision).toBe(initialRevision);
    expect(state.currentFrame).toBe(initialFrame);
    expect(state.selectedClipId).toBe(initialSelection);
    expect(state.historyPast.length).toBe(initialHistoryLength);
  });
});

