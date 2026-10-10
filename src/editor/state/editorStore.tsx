import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { VideoProject, SubtitleCue, TrackSetting } from '../../domain/video/VideoProject';
import { SceneConfig } from '../../domain/video/Scene';
import { AudioTrackConfig } from '../../domain/video/AudioTrack';
import { ProjectTimeline } from '../../domain/video/Timeline';
import { buildTimeline } from '../../application/timeline/buildTimeline';
import { demoProject } from '../../../projects/demo/project';
import { generateId } from '../../shared/utils/id';
import { validateProposal } from '../../application/assistant/projectProposals';
import type { ProjectProposal } from '../../shared/types/assistant';

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
  historyPast: VideoProject[];
  historyFuture: VideoProject[];
  assistantEpoch: string | null;
  appliedAiProposalIds: string[];
  assistantApplyError: string | null;
  workspaceMode: 'ai' | 'edit' | 'preview';
  isInspectorOpen: boolean;
  isTimelineCollapsed: boolean;
  activeLeftTab: 'ai' | 'assets' | 'scenes';
}

export type EditorAction =
  | { type: 'SET_ASSISTANT_SESSION'; epoch: string | null }
  | { type: 'APPLY_AI_PROJECT_CHANGE'; proposal: ProjectProposal }
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
  | { type: 'SET_SAVE_STATUS'; status: PersistenceStatus; error?: string; savedAt?: number }
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
    historyPast: [],
    historyFuture: [],
    assistantEpoch: null,
    appliedAiProposalIds: [],
    assistantApplyError: null,
    workspaceMode: 'ai',
    isInspectorOpen: false,
    isTimelineCollapsed: false,
    activeLeftTab: 'ai',
  };
}

export function pushHistory(state: EditorState, newProject: VideoProject): EditorState {
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
    historyPast: [...state.historyPast.slice(-19), state.project], // keep max 20 history states
    historyFuture: [],
  };
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
      return { ...state, assistantEpoch: action.epoch, assistantApplyError: null };

    case 'APPLY_AI_PROJECT_CHANGE': {
      try {
        if (state.appliedAiProposalIds.includes(action.proposal.id)) throw new Error('Proposal đã được áp dụng.');
        if (state.appliedAiProposalIds.length >= 1000) throw new Error('Hãy mở lại project để bắt đầu phiên chỉnh sửa mới.');
        const proposal = validateProposal(state.project, state.revision, state.assistantEpoch, action.proposal);
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

    case 'ADD_SCENE': {
      const newScenes = [...state.project.scenes, action.scene];
      const nextState = pushHistory(state, { ...state.project, scenes: newScenes });
      return { ...nextState, selectedClipId: action.scene.id };
    }

    case 'UPDATE_SCENE': {
      const updatedScenes = state.project.scenes.map((s) =>
        s.id === action.sceneId ? ({ ...s, ...action.updates } as SceneConfig) : s
      );
      return pushHistory(state, { ...state.project, scenes: updatedScenes });
    }

    case 'DELETE_SCENE': {
      if (state.project.scenes.length <= 1) return state; // Preserve at least 1 scene
      const filteredScenes = state.project.scenes.filter((s) => s.id !== action.sceneId);
      return pushHistory(state, { ...state.project, scenes: filteredScenes });
    }

    case 'SPLIT_SCENE': {
      const sceneIndex = state.project.scenes.findIndex((s) => s.id === action.sceneId);
      if (sceneIndex === -1) return state;

      const computedScene = state.timeline.computedScenes[sceneIndex];
      const offsetInScene = action.atFrame - computedScene.startFrame;

      // Only split if at least 5 frames from start and end
      if (offsetInScene <= 5 || offsetInScene >= computedScene.durationInFrames - 5) {
        return state;
      }

      const originalScene = state.project.scenes[sceneIndex];
      const scenePart1: SceneConfig = {
        ...originalScene,
        durationInFrames: offsetInScene,
      };

      // Calculate consumed source frames for video to prevent repeating source in part 2
      const consumedSourceFrames = originalScene.type === 'video'
        ? Math.round(offsetInScene * (originalScene.playbackRate ?? 1))
        : 0;

      const newId = action.newSceneId ?? `${originalScene.id}_split_${generateId('part')}`;

      const scenePart2: SceneConfig = {
        ...originalScene,
        id: newId,
        durationInFrames: originalScene.durationInFrames - offsetInScene,
        ...(originalScene.type === 'video'
          ? {
              startFromFrame: (originalScene.startFromFrame ?? 0) + consumedSourceFrames,
            }
          : {}),
      };

      const newScenes = [
        ...state.project.scenes.slice(0, sceneIndex),
        scenePart1,
        scenePart2,
        ...state.project.scenes.slice(sceneIndex + 1),
      ];

      const nextState = pushHistory(state, { ...state.project, scenes: newScenes });
      return {
        ...nextState,
        selectedClipId: scenePart2.id,
      };
    }

    case 'DUPLICATE_SCENE': {
      const scene = state.project.scenes.find((s) => s.id === action.sceneId);
      if (!scene) return state;

      const newId = action.newSceneId ?? `${scene.id}_copy_${generateId('dup')}`;
      const duplicated: SceneConfig = {
        ...scene,
        id: newId,
      };

      const sceneIndex = state.project.scenes.findIndex((s) => s.id === action.sceneId);
      const newScenes = [
        ...state.project.scenes.slice(0, sceneIndex + 1),
        duplicated,
        ...state.project.scenes.slice(sceneIndex + 1),
      ];

      const nextState = pushHistory(state, { ...state.project, scenes: newScenes });
      return { ...nextState, selectedClipId: newId };
    }

    case 'ADD_AUDIO_TRACK': {
      const tracks = [...(state.project.audioTracks ?? []), action.track];
      return pushHistory(state, { ...state.project, audioTracks: tracks });
    }

    case 'UPDATE_AUDIO_TRACK': {
      if (!state.project.audioTracks) return state;
      const updatedTracks = state.project.audioTracks.map((t) =>
        t.id === action.trackId ? ({ ...t, ...action.updates } as AudioTrackConfig) : t
      );
      return pushHistory(state, { ...state.project, audioTracks: updatedTracks });
    }

    case 'DELETE_AUDIO_TRACK': {
      if (!state.project.audioTracks) return state;
      const filtered = state.project.audioTracks.filter((t) => t.id !== action.trackId);
      return pushHistory(state, { ...state.project, audioTracks: filtered });
    }

    case 'SET_TRACK_SETTING': {
      const current = state.project.trackSettings ?? {};
      const updated = {
        ...current,
        [action.trackId]: {
          ...(current[action.trackId] ?? {}),
          ...action.setting,
        },
      };
      return pushHistory(state, { ...state.project, trackSettings: updated });
    }

    case 'SET_SUBTITLES': {
      return pushHistory(state, { ...state.project, subtitles: action.subtitles });
    }

    case 'UPDATE_PROJECT_METADATA': {
      return pushHistory(state, { ...state.project, ...action.updates });
    }

    case 'LOAD_PROJECT': {
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
        saveStatus: 'saved',
        saveError: null,
        lastSavedAt: Date.now(),
        historyPast: [],
        historyFuture: [],
        assistantEpoch: null,
        assistantApplyError: null,
      };
    }

    case 'RESET_PROJECT': {
      const target = action.project ?? demoProject;
      return createInitialState(target);
    }

    case 'SET_SAVE_STATUS': {
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
