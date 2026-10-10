import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { VideoProject, SubtitleCue, TrackSetting } from '../../domain/video/VideoProject';
import { SceneConfig } from '../../domain/video/Scene';
import { AudioTrackConfig } from '../../domain/video/AudioTrack';
import { ProjectTimeline } from '../../domain/video/Timeline';
import { buildTimeline } from '../../application/timeline/buildTimeline';
import {
  addAudioTrack,
  addScene,
  deleteAudioTrack,
  deleteScene,
  duplicateScene,
  setSubtitles,
  setTrackSetting,
  splitScene,
  updateAudioTrack,
  updateProjectMetadata,
  updateScene,
} from '../../application/timeline/projectCommands';
import { demoProject } from '../../../projects/demo/project';
import { validateProposal, validateLockedContent } from '../../application/assistant/projectProposals';
import type { ProjectProposal, ProposalLease } from '../../application/assistant/assistant.contracts';
import type { RegisteredAsset } from '../../application/scene-generation/generation.contracts';

export type PersistenceStatus = 'saved' | 'dirty' | 'saving' | 'error';

export interface EditorState {
  project: VideoProject;
  timeline: ProjectTimeline;
  currentFrame: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  zoomPixelsPerSecond: number;
  snappingEnabled: boolean;
  activeTool: 'select' | 'split';
  isSafeAreasVisible: boolean;
  isExportModalOpen: boolean;
  revision: number;
  saveStatus: PersistenceStatus;
  lastSavedAt: number | null;
  saveError: string | null;
  editError: string | null;
  historyPast: VideoProject[];
  historyFuture: VideoProject[];
  assistantEpoch: string | null;
  registeredAssets: RegisteredAsset[];
  appliedAiProposalIds: string[];
  assistantApplyError: string | null;
  workspaceMode: 'ai' | 'edit' | 'preview';
  isInspectorOpen: boolean;
  isTimelineCollapsed: boolean;
  activeLeftTab: 'ai' | 'assets' | 'scenes';
}

export type EditorAction =
  | { type: 'SET_ASSISTANT_SESSION'; epoch: string | null }
  | { type: 'APPLY_AI_PROJECT_CHANGE'; proposal: ProjectProposal; lease?: ProposalLease }
  | { type: 'SET_ASSET_MANIFEST'; projectId: string; epoch: string; assets: RegisteredAsset[] }
  | { type: 'SET_WORKSPACE_MODE'; mode: 'ai' | 'edit' | 'preview' }
  | { type: 'SET_INSPECTOR_OPEN'; open: boolean }
  | { type: 'TOGGLE_INSPECTOR' }
  | { type: 'SET_TIMELINE_COLLAPSED'; collapsed: boolean }
  | { type: 'TOGGLE_TIMELINE_COLLAPSE' }
  | { type: 'SET_ACTIVE_LEFT_TAB'; tab: 'ai' | 'assets' | 'scenes' }
  | { type: 'SET_CURRENT_FRAME'; frame: number }
  | { type: 'SET_IS_PLAYING'; isPlaying: boolean }
  | { type: 'TOGGLE_PLAYING' }
  | { type: 'SET_SELECTED_CLIP'; clipId: string | null }
  | { type: 'SET_ZOOM'; pixelsPerSecond: number }
  | { type: 'SET_SNAPPING'; enabled: boolean }
  | { type: 'SET_ACTIVE_TOOL'; tool: 'select' | 'split' }
  | { type: 'TOGGLE_SAFE_AREAS' }
  | { type: 'SET_EXPORT_MODAL'; open: boolean }
  | { type: 'CLEAR_EDIT_ERROR' }
  | { type: 'ADD_SCENE'; scene: SceneConfig }
  | { type: 'UPDATE_SCENE'; sceneId: string; updates: Partial<SceneConfig> }
  | { type: 'DELETE_SCENE'; sceneId: string }
  | { type: 'SPLIT_SCENE'; sceneId: string; atFrame: number; newSceneId?: string }
  | { type: 'DUPLICATE_SCENE'; sceneId: string; newSceneId?: string }
  | { type: 'ADD_AUDIO_TRACK'; track: AudioTrackConfig }
  | { type: 'UPDATE_AUDIO_TRACK'; trackId: string; updates: Partial<AudioTrackConfig> }
  | { type: 'DELETE_AUDIO_TRACK'; trackId: string }
  | { type: 'SET_TRACK_SETTING'; trackId: string; setting: Partial<TrackSetting> }
  | { type: 'SET_SUBTITLES'; subtitles: SubtitleCue[] }
  | { type: 'UPDATE_PROJECT_METADATA'; updates: Partial<VideoProject> }
  | { type: 'LOAD_PROJECT'; project: VideoProject; revision?: number }
  | { type: 'RESET_PROJECT'; project?: VideoProject }
  | { type: 'SET_SAVE_STATUS'; status: PersistenceStatus; error?: string; savedAt?: number; revision?: number }
  | { type: 'UNDO' }
  | { type: 'REDO' };


export function reconcileTimelineState(
  currentFrame: number,
  selectedClipId: string | null,
  project: VideoProject,
  timeline: ProjectTimeline
) {
  const maxFrame = Math.max(0, timeline.totalDurationInFrames - 1);
  const clampedFrame = Number.isFinite(currentFrame)
    ? Math.max(0, Math.min(maxFrame, Math.round(currentFrame)))
    : 0;

  const isSceneValid = project.scenes.some((s) => s.id === selectedClipId);
  const isAudioValid = project.audioTracks?.some((a) => a.id === selectedClipId) ?? false;
  const isSubtitleValid = project.subtitles?.some((sub) => sub.id === selectedClipId) ?? false;

  const reconciledSelection = (isSceneValid || isAudioValid || isSubtitleValid)
    ? selectedClipId
    : project.scenes[0]?.id ?? null;

  return {
    currentFrame: clampedFrame,
    selectedClipId: reconciledSelection,
  };
}

export function createInitialState(initialProject: VideoProject = demoProject): EditorState {
  const timeline = buildTimeline(initialProject);
  return {
    project: initialProject,
    timeline,
    currentFrame: 0,
    isPlaying: false,
    selectedClipId: initialProject.scenes[0]?.id || null,
    zoomPixelsPerSecond: 120,
    snappingEnabled: true,
    activeTool: 'select',
    isSafeAreasVisible: false,
    isExportModalOpen: false,
    revision: 1,
    saveStatus: 'saved',
    lastSavedAt: Date.now(),
    saveError: null,
    editError: null,
    historyPast: [],
    historyFuture: [],
    assistantEpoch: null,
    registeredAssets: [],
    appliedAiProposalIds: [],
    assistantApplyError: null,
    workspaceMode: 'ai',
    isInspectorOpen: false,
    isTimelineCollapsed: false,
    activeLeftTab: 'ai',
  };
}

export function pushHistory(state: EditorState, newProject: VideoProject): EditorState {
  try {
    validateLockedContent(state.project, newProject);
    const newTimeline = buildTimeline(newProject);
    const reconciled = reconcileTimelineState(
      state.currentFrame,
      state.selectedClipId,
      newProject,
      newTimeline
    );

    return {
      ...state,
      project: newProject,
      timeline: newTimeline,
      currentFrame: reconciled.currentFrame,
      selectedClipId: reconciled.selectedClipId,
      revision: state.revision + 1,
      saveStatus: 'dirty',
      saveError: null,
      editError: null,
      historyPast: [...state.historyPast.slice(-19), state.project], // keep max 20 history states
      historyFuture: [],
    };
  } catch (err) {
    return {
      ...state,
      editError: err instanceof Error ? err.message : String(err),
    };
  }
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_WORKSPACE_MODE': {
      if (action.mode === 'ai') {
        return {
          ...state,
          workspaceMode: 'ai',
          activeLeftTab: 'ai',
          isInspectorOpen: false,
          isTimelineCollapsed: false,
        };
      }
      if (action.mode === 'edit') {
        return {
          ...state,
          workspaceMode: 'edit',
          isInspectorOpen: true,
          isTimelineCollapsed: false,
        };
      }
      return {
        ...state,
        workspaceMode: 'preview',
        isInspectorOpen: false,
        isTimelineCollapsed: true,
      };
    }

    case 'SET_INSPECTOR_OPEN':
      return { ...state, isInspectorOpen: action.open };

    case 'TOGGLE_INSPECTOR':
      return { ...state, isInspectorOpen: !state.isInspectorOpen };

    case 'SET_TIMELINE_COLLAPSED':
      return { ...state, isTimelineCollapsed: action.collapsed };

    case 'TOGGLE_TIMELINE_COLLAPSE':
      return { ...state, isTimelineCollapsed: !state.isTimelineCollapsed };

    case 'SET_ACTIVE_LEFT_TAB':
      return { ...state, activeLeftTab: action.tab };

    case 'SET_ASSISTANT_SESSION':
      return { ...state, assistantEpoch: action.epoch, registeredAssets: state.assistantEpoch === action.epoch ? state.registeredAssets : [], assistantApplyError: null };

    case 'SET_ASSET_MANIFEST':
      return action.projectId === state.project.id && action.epoch === state.assistantEpoch ? { ...state, registeredAssets: action.assets } : state;

    case 'APPLY_AI_PROJECT_CHANGE': {
      try {
        if (state.appliedAiProposalIds.includes(action.proposal.id)) throw new Error('Proposal đã được áp dụng.');
        if (state.appliedAiProposalIds.length >= 1000) throw new Error('Hãy mở lại project để bắt đầu phiên chỉnh sửa mới.');
        if (action.lease && action.lease.expiresAt <= Date.now()) throw new Error('Lần áp dụng đã hết thời gian; bản nháp được giữ.');
        const proposal = validateProposal(state.project, state.revision, state.assistantEpoch, action.proposal,
          { allowedNewAssetKeys: new Set(state.registeredAssets.map((asset) => asset.storageKey)), mediaMetadata: new Map(state.registeredAssets.map((asset) => [asset.storageKey, asset.metadata])) });
        return { ...pushHistory(state, proposal.candidate), appliedAiProposalIds: [...state.appliedAiProposalIds, proposal.id], assistantApplyError: null };
      } catch (error) {
        return { ...state, assistantApplyError: error instanceof Error ? error.message : 'Proposal không hợp lệ.' };
      }
    }
    case 'SET_CURRENT_FRAME': {
      const maxFrame = Math.max(0, state.timeline.totalDurationInFrames - 1);
      const clamped = Number.isFinite(action.frame)
        ? Math.max(0, Math.min(maxFrame, Math.round(action.frame)))
        : 0;
      return { ...state, currentFrame: clamped };
    }

    case 'SET_IS_PLAYING':
      return { ...state, isPlaying: action.isPlaying };

    case 'TOGGLE_PLAYING':
      return { ...state, isPlaying: !state.isPlaying };

    case 'SET_SELECTED_CLIP':
      return {
        ...state,
        selectedClipId: action.clipId,
        isInspectorOpen: action.clipId ? true : state.isInspectorOpen,
      };


    case 'SET_ZOOM':
      return { ...state, zoomPixelsPerSecond: Math.max(30, Math.min(400, action.pixelsPerSecond)) };

    case 'SET_SNAPPING':
      return { ...state, snappingEnabled: action.enabled };

    case 'SET_ACTIVE_TOOL':
      return { ...state, activeTool: action.tool };

    case 'TOGGLE_SAFE_AREAS':
      return { ...state, isSafeAreasVisible: !state.isSafeAreasVisible };

    case 'SET_EXPORT_MODAL':
      return { ...state, isExportModalOpen: action.open };

    case 'CLEAR_EDIT_ERROR':
      return { ...state, editError: null };

    case 'ADD_SCENE': {
      const command = addScene(state.project, action.scene);
      const nextState = pushHistory(state, command.project);
      if (nextState.project === state.project) return nextState;
      return { ...nextState, selectedClipId: command.selectedClipId ?? nextState.selectedClipId };
    }

    case 'UPDATE_SCENE': {
      return pushHistory(state, updateScene(state.project, action.sceneId, action.updates));
    }

    case 'DELETE_SCENE': {
      const nextProject = deleteScene(state.project, action.sceneId);
      return nextProject === state.project ? state : pushHistory(state, nextProject);
    }

    case 'SPLIT_SCENE': {
      try {
        const command = splitScene(
          state.project,
          state.timeline,
          action.sceneId,
          action.atFrame,
          action.newSceneId,
        );
        if (command.project === state.project) return state;
        const nextState = pushHistory(state, command.project);
        if (nextState.project === state.project) return nextState;
        return {
          ...nextState,
          selectedClipId: command.selectedClipId ?? nextState.selectedClipId,
        };
      } catch (error) {
        return {
          ...state,
          editError: error instanceof Error ? error.message : String(error),
        };
      }
    }

    case 'DUPLICATE_SCENE': {
      const command = duplicateScene(state.project, action.sceneId, action.newSceneId);
      if (command.project === state.project) return state;
      const nextState = pushHistory(state, command.project);
      if (nextState.project === state.project) return nextState;
      return {
        ...nextState,
        selectedClipId: command.selectedClipId ?? nextState.selectedClipId,
      };
    }

    case 'ADD_AUDIO_TRACK': {
      return pushHistory(state, addAudioTrack(state.project, action.track));
    }

    case 'UPDATE_AUDIO_TRACK': {
      const nextProject = updateAudioTrack(state.project, action.trackId, action.updates);
      return nextProject === state.project ? state : pushHistory(state, nextProject);
    }

    case 'DELETE_AUDIO_TRACK': {
      const nextProject = deleteAudioTrack(state.project, action.trackId);
      return nextProject === state.project ? state : pushHistory(state, nextProject);
    }

    case 'SET_TRACK_SETTING': {
      const candidateProject = setTrackSetting(state.project, action.trackId, action.setting);
      try {
        const newTimeline = buildTimeline(candidateProject);
        return {
          ...state,
          project: candidateProject,
          timeline: newTimeline,
          revision: state.revision + 1,
          saveStatus: 'dirty',
          saveError: null,
          editError: null,
          historyPast: [...state.historyPast.slice(-19), state.project],
          historyFuture: [],
        };
      } catch (err) {
        return {
          ...state,
          editError: err instanceof Error ? err.message : String(err),
        };
      }
    }

    case 'SET_SUBTITLES': {
      return pushHistory(state, setSubtitles(state.project, action.subtitles));
    }

    case 'UPDATE_PROJECT_METADATA': {
      return pushHistory(state, updateProjectMetadata(state.project, action.updates));
    }

    case 'LOAD_PROJECT': {
      try {
        const timeline = buildTimeline(action.project);
        const reconciled = reconcileTimelineState(
          state.currentFrame,
          state.selectedClipId,
          action.project,
          timeline
        );
        return {
          ...state,
          project: action.project,
          timeline,
          currentFrame: reconciled.currentFrame,
          selectedClipId: reconciled.selectedClipId,
          revision: action.revision ?? state.revision + 1,
          saveStatus: action.revision === undefined ? 'dirty' : 'saved',
          saveError: null,
          editError: null,
          lastSavedAt: Date.now(),
          historyPast: [],
          historyFuture: [],
          assistantEpoch: null,
          registeredAssets: [],
          assistantApplyError: null,
        };
      } catch (err) {
        return {
          ...state,
          editError: err instanceof Error ? err.message : 'Invalid project timeline',
        };
      }
    }

    case 'RESET_PROJECT': {
      const target = action.project ?? demoProject;
      return createInitialState(target);
    }

    case 'SET_SAVE_STATUS': {
      // If setting to 'saved' but state.revision has advanced past the revision that was saved, preserve 'dirty'!
      if (action.status === 'saved' && action.revision !== undefined && state.revision > action.revision) {
        return {
          ...state,
          saveError: null,
          lastSavedAt: action.savedAt ?? Date.now(),
        };
      }
      return {
        ...state,
        saveStatus: action.status,
        saveError: action.error ?? null,
        lastSavedAt: action.savedAt ?? (action.status === 'saved' ? Date.now() : state.lastSavedAt),
      };
    }

    case 'UNDO': {
      if (state.historyPast.length === 0) return state;
      const prev = state.historyPast[state.historyPast.length - 1];
      const newPast = state.historyPast.slice(0, -1);
      const timeline = buildTimeline(prev);
      const reconciled = reconcileTimelineState(state.currentFrame, state.selectedClipId, prev, timeline);

      return {
        ...state,
        project: prev,
        timeline,
        currentFrame: reconciled.currentFrame,
        selectedClipId: reconciled.selectedClipId,
        revision: state.revision + 1,
        saveStatus: 'dirty',
        historyPast: newPast,
        historyFuture: [state.project, ...state.historyFuture],
      };
    }

    case 'REDO': {
      if (state.historyFuture.length === 0) return state;
      const next = state.historyFuture[0];
      const newFuture = state.historyFuture.slice(1);
      const timeline = buildTimeline(next);
      const reconciled = reconcileTimelineState(state.currentFrame, state.selectedClipId, next, timeline);

      return {
        ...state,
        project: next,
        timeline,
        currentFrame: reconciled.currentFrame,
        selectedClipId: reconciled.selectedClipId,
        revision: state.revision + 1,
        saveStatus: 'dirty',
        historyPast: [...state.historyPast, state.project],
        historyFuture: newFuture,
      };
    }

    default:
      return state;
  }
}

interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export const EditorProvider: React.FC<{ initialProject?: VideoProject; children: React.ReactNode }> = ({
  initialProject,
  children,
}) => {
  const [state, dispatch] = useReducer(editorReducer, initialProject, createInitialState);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}
