import React, { createContext, useContext, useReducer, useMemo } from 'react';
import { VideoProject } from '../../domain/video/VideoProject';
import { SceneConfig } from '../../domain/video/Scene';
import { AudioTrackConfig } from '../../domain/video/AudioTrack';
import { ProjectTimeline } from '../../domain/video/Timeline';
import { buildTimeline } from '../../application/timeline/buildTimeline';
import { demoProject } from '../../../projects/demo/project';

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
  historyPast: VideoProject[];
  historyFuture: VideoProject[];
}

export type EditorAction =
  | { type: 'SET_CURRENT_FRAME'; frame: number }
  | { type: 'SET_IS_PLAYING'; isPlaying: boolean }
  | { type: 'TOGGLE_PLAYING' }
  | { type: 'SET_SELECTED_CLIP'; clipId: string | null }
  | { type: 'SET_ZOOM'; pixelsPerSecond: number }
  | { type: 'SET_SNAPPING'; enabled: boolean }
  | { type: 'SET_ACTIVE_TOOL'; tool: 'select' | 'split' }
  | { type: 'TOGGLE_SAFE_AREAS' }
  | { type: 'SET_EXPORT_MODAL'; open: boolean }
  | { type: 'UPDATE_SCENE'; sceneId: string; updates: Partial<SceneConfig> }
  | { type: 'DELETE_SCENE'; sceneId: string }
  | { type: 'SPLIT_SCENE'; sceneId: string; atFrame: number }
  | { type: 'UPDATE_AUDIO_TRACK'; trackId: string; updates: Partial<AudioTrackConfig> }
  | { type: 'UPDATE_PROJECT_METADATA'; updates: Partial<VideoProject> }
  | { type: 'UNDO' }
  | { type: 'REDO' };

function createInitialState(initialProject: VideoProject = demoProject): EditorState {
  const timeline = buildTimeline(initialProject);
  return {
    project: initialProject,
    timeline,
    currentFrame: 0,
    isPlaying: false,
    selectedClipId: initialProject.scenes[0]?.id || null,
    zoomPixelsPerSecond: 120, // 120px per second default
    snappingEnabled: true,
    activeTool: 'select',
    isSafeAreasVisible: false,
    isExportModalOpen: false,
    historyPast: [],
    historyFuture: [],
  };
}

function pushHistory(state: EditorState, newProject: VideoProject): EditorState {
  const newTimeline = buildTimeline(newProject);
  return {
    ...state,
    project: newProject,
    timeline: newTimeline,
    historyPast: [...state.historyPast.slice(-20), state.project], // keep max 20 history states
    historyFuture: [],
  };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_CURRENT_FRAME': {
      const clamped = Math.max(0, Math.min(state.timeline.totalDurationInFrames, Math.round(action.frame)));
      return { ...state, currentFrame: clamped };
    }

    case 'SET_IS_PLAYING':
      return { ...state, isPlaying: action.isPlaying };

    case 'TOGGLE_PLAYING':
      return { ...state, isPlaying: !state.isPlaying };

    case 'SET_SELECTED_CLIP':
      return { ...state, selectedClipId: action.clipId };

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

    case 'UPDATE_SCENE': {
      const updatedScenes = state.project.scenes.map((s) =>
        s.id === action.sceneId ? ({ ...s, ...action.updates } as SceneConfig) : s
      );
      return pushHistory(state, { ...state.project, scenes: updatedScenes });
    }

    case 'DELETE_SCENE': {
      if (state.project.scenes.length <= 1) return state; // Preserve at least 1 scene
      const filteredScenes = state.project.scenes.filter((s) => s.id !== action.sceneId);
      const nextSelected = state.selectedClipId === action.sceneId ? filteredScenes[0]?.id || null : state.selectedClipId;
      return {
        ...pushHistory(state, { ...state.project, scenes: filteredScenes }),
        selectedClipId: nextSelected,
      };
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
      const scenePart2: SceneConfig = {
        ...originalScene,
        id: `${originalScene.id}_split_${Date.now().toString().slice(-4)}`,
        durationInFrames: originalScene.durationInFrames - offsetInScene,
      };

      const newScenes = [
        ...state.project.scenes.slice(0, sceneIndex),
        scenePart1,
        scenePart2,
        ...state.project.scenes.slice(sceneIndex + 1),
      ];

      return {
        ...pushHistory(state, { ...state.project, scenes: newScenes }),
        selectedClipId: scenePart2.id,
      };
    }

    case 'UPDATE_AUDIO_TRACK': {
      if (!state.project.audioTracks) return state;
      const updatedTracks = state.project.audioTracks.map((t) =>
        t.id === action.trackId ? ({ ...t, ...action.updates } as AudioTrackConfig) : t
      );
      return pushHistory(state, { ...state.project, audioTracks: updatedTracks });
    }

    case 'UPDATE_PROJECT_METADATA': {
      return pushHistory(state, { ...state.project, ...action.updates });
    }

    case 'UNDO': {
      if (state.historyPast.length === 0) return state;
      const prev = state.historyPast[state.historyPast.length - 1];
      const newPast = state.historyPast.slice(0, -1);
      const timeline = buildTimeline(prev);
      return {
        ...state,
        project: prev,
        timeline,
        historyPast: newPast,
        historyFuture: [state.project, ...state.historyFuture],
      };
    }

    case 'REDO': {
      if (state.historyFuture.length === 0) return state;
      const next = state.historyFuture[0];
      const newFuture = state.historyFuture.slice(1);
      const timeline = buildTimeline(next);
      return {
        ...state,
        project: next,
        timeline,
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
