import type { AudioTrackConfig } from '../../domain/video/AudioTrack';
import type { SceneConfig } from '../../domain/video/Scene';
import type { ProjectTimeline } from '../../domain/video/Timeline';
import type { SubtitleCue, TrackSetting, VideoProject } from '../../domain/video/VideoProject';
import { generateId } from '../../shared/utils/id';

export interface ProjectCommandResult {
  project: VideoProject;
  selectedClipId?: string;
}

export function addScene(project: VideoProject, scene: SceneConfig): ProjectCommandResult {
  return {
    project: { ...project, scenes: [...project.scenes, scene] },
    selectedClipId: scene.id,
  };
}

export function updateScene(
  project: VideoProject,
  sceneId: string,
  updates: Partial<SceneConfig>,
): VideoProject {
  return {
    ...project,
    scenes: project.scenes.map((scene) =>
      scene.id === sceneId ? ({ ...scene, ...updates } as SceneConfig) : scene,
    ),
  };
}

export function deleteScene(project: VideoProject, sceneId: string): VideoProject {
  if (project.scenes.length <= 1) return project;
  return { ...project, scenes: project.scenes.filter((scene) => scene.id !== sceneId) };
}

export function splitScene(
  project: VideoProject,
  timeline: ProjectTimeline,
  sceneId: string,
  atFrame: number,
  newSceneId?: string,
): ProjectCommandResult {
  const sceneIndex = project.scenes.findIndex((scene) => scene.id === sceneId);
  if (sceneIndex === -1) return { project };

  const computedScene = timeline.computedScenes[sceneIndex];
  const offsetInScene = atFrame - computedScene.startFrame;
  if (offsetInScene <= 5 || offsetInScene >= computedScene.durationInFrames - 5) {
    throw new Error('Điểm chia phải cách đầu và cuối scene ít nhất 5 frames.');
  }

  const originalScene = project.scenes[sceneIndex];
  const incomingCrossfade =
    computedScene.incomingTransition?.type === 'crossfade'
      ? computedScene.incomingTransition.durationInFrames
      : 0;
  if (offsetInScene <= incomingCrossfade) {
    throw new Error(
      `Không thể chia scene ở frame ${offsetInScene}: vi phạm incoming crossfade (${incomingCrossfade} frames).`,
    );
  }

  const outgoingTransition = originalScene.transition?.durationInFrames ?? 0;
  if (originalScene.durationInFrames - offsetInScene <= outgoingTransition) {
    throw new Error(
      `Không thể chia scene: phần sau quá ngắn so với outgoing transition (${outgoingTransition} frames).`,
    );
  }

  const firstPart: SceneConfig = {
    ...originalScene,
    transition: undefined,
    durationInFrames: offsetInScene,
  };
  const consumedSourceFrames =
    originalScene.type === 'video'
      ? Math.round(offsetInScene * (originalScene.playbackRate ?? 1))
      : 0;
  const secondPartId = newSceneId ?? `${originalScene.id}_split_${generateId('part')}`;
  const secondPart: SceneConfig = {
    ...originalScene,
    id: secondPartId,
    durationInFrames: originalScene.durationInFrames - offsetInScene,
    transition: originalScene.transition,
    ...(originalScene.type === 'video'
      ? { startFromFrame: (originalScene.startFromFrame ?? 0) + consumedSourceFrames }
      : {}),
  };

  return {
    project: {
      ...project,
      scenes: [
        ...project.scenes.slice(0, sceneIndex),
        firstPart,
        secondPart,
        ...project.scenes.slice(sceneIndex + 1),
      ],
    },
    selectedClipId: secondPartId,
  };
}

export function duplicateScene(
  project: VideoProject,
  sceneId: string,
  newSceneId?: string,
): ProjectCommandResult {
  const sceneIndex = project.scenes.findIndex((scene) => scene.id === sceneId);
  if (sceneIndex === -1) return { project };
  const scene = project.scenes[sceneIndex];
  const duplicatedId = newSceneId ?? `${scene.id}_copy_${generateId('dup')}`;
  return {
    project: {
      ...project,
      scenes: [
        ...project.scenes.slice(0, sceneIndex + 1),
        { ...scene, id: duplicatedId },
        ...project.scenes.slice(sceneIndex + 1),
      ],
    },
    selectedClipId: duplicatedId,
  };
}

export function addAudioTrack(project: VideoProject, track: AudioTrackConfig): VideoProject {
  return { ...project, audioTracks: [...(project.audioTracks ?? []), track] };
}

export function updateAudioTrack(
  project: VideoProject,
  trackId: string,
  updates: Partial<AudioTrackConfig>,
): VideoProject {
  if (!project.audioTracks) return project;
  return {
    ...project,
    audioTracks: project.audioTracks.map((track) =>
      track.id === trackId ? ({ ...track, ...updates } as AudioTrackConfig) : track,
    ),
  };
}

export function deleteAudioTrack(project: VideoProject, trackId: string): VideoProject {
  if (!project.audioTracks) return project;
  return { ...project, audioTracks: project.audioTracks.filter((track) => track.id !== trackId) };
}

export function setTrackSetting(
  project: VideoProject,
  trackId: string,
  setting: Partial<TrackSetting>,
): VideoProject {
  const current = project.trackSettings ?? {};
  return {
    ...project,
    trackSettings: {
      ...current,
      [trackId]: { ...(current[trackId] ?? {}), ...setting },
    },
  };
}

export function setSubtitles(project: VideoProject, subtitles: SubtitleCue[]): VideoProject {
  return { ...project, subtitles };
}

export function updateProjectMetadata(
  project: VideoProject,
  updates: Partial<VideoProject>,
): VideoProject {
  return { ...project, ...updates };
}
