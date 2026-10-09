import React, { useMemo } from 'react';
import { Sequence, AbsoluteFill } from 'remotion';
import { MainVideoProps, defaultMainVideoProps } from './MainVideo.config';
import { buildTimeline } from '../../../application/timeline/buildTimeline';
import { SceneRenderer } from '../../scenes/SceneRenderer';
import { SubtitleLayer } from '../../components/SubtitleLayer/SubtitleLayer';
import { AudioLayer } from '../../components/AudioLayer/AudioLayer';

/**
 * Main composition orchestrator.
 * Reads the project definition, builds timeline boundaries,
 * and delegates scene rendering to the SceneRenderer.
 */
export const MainVideo: React.FC<MainVideoProps> = ({ project = defaultMainVideoProps.project! }) => {
  const timeline = useMemo(() => buildTimeline(project), [project]);
  const isVisualHidden = Boolean(project.trackSettings?.['V1']?.hidden);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000000',
      }}
    >
      {/* Visual Scene Sequence */}
      {!isVisualHidden &&
        timeline.computedScenes.map((computed) => (
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
      {project.subtitles && project.subtitles.length > 0 && (
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

