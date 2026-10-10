import React, { useMemo } from 'react';
import { Sequence, AbsoluteFill } from 'remotion';
import { MainVideoProps, defaultMainVideoProps } from './MainVideo.config';
import { buildTimeline } from '../../../application/timeline/buildTimeline';
import { SceneRenderer } from '../../scenes/SceneRenderer';
import { SubtitleLayer } from '../../components/SubtitleLayer/SubtitleLayer';
import { AudioLayer } from '../../components/AudioLayer/AudioLayer';
import { getSceneTrackId } from '../../../domain/video/trackUtils';

/**
 * Main composition orchestrator.
 * Reads the project definition, builds timeline boundaries,
 * and delegates scene rendering to the SceneRenderer.
 */
export const MainVideo: React.FC<MainVideoProps> = ({ project = defaultMainVideoProps.project! }) => {
  const timeline = useMemo(() => buildTimeline(project), [project]);

  // Filter scenes per visual track (V1 and V2) based on trackSettings hidden state
  const visibleScenes = useMemo(() => {
    return timeline.computedScenes.filter((computed) => {
      const trackId = getSceneTrackId(computed.scene, project.scenes);
      return !project.trackSettings?.[trackId]?.hidden;
    });
  }, [timeline.computedScenes, project.scenes, project.trackSettings]);

  const isSubtitlesHidden = Boolean(project.trackSettings?.subtitles?.hidden);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000000',
      }}
    >
      {/* Visual Scene Sequence */}
      {visibleScenes.map((computed) => (
        <Sequence
          key={computed.scene.id}
          from={computed.startFrame}
          durationInFrames={computed.durationInFrames}
          name={computed.scene.id}
        >
          <SceneRenderer computed={computed} />
        </Sequence>
      ))}

      {/* Subtitle Layer */}
      {project.subtitles && project.subtitles.length > 0 && !isSubtitlesHidden && (
        <SubtitleLayer captions={project.subtitles} />
      )}

      {/* Audio Track Layers */}
      {project.audioTracks &&
        project.audioTracks.map((track) => (
          <AudioLayer
            key={track.id}
            track={track}
            muted={Boolean(project.trackSettings?.[track.id]?.muted)}
          />
        ))}
    </AbsoluteFill>
  );
};
