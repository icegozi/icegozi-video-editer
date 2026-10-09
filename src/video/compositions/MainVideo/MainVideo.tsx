import React, { useMemo } from 'react';
import { Sequence, AbsoluteFill } from 'remotion';
import { MainVideoProps, defaultMainVideoProps } from './MainVideo.config';
import { buildTimeline } from '../../../application/timeline/buildTimeline';
import { SceneRenderer } from '../../scenes/SceneRenderer';
import { AudioLayer } from '../../components/AudioLayer/AudioLayer';

/**
 * Main composition orchestrator.
 * Reads the project definition, builds timeline boundaries,
 * and delegates scene rendering to the SceneRenderer.
 */
export const MainVideo: React.FC<MainVideoProps> = ({ project = defaultMainVideoProps.project! }) => {
  const timeline = useMemo(() => buildTimeline(project), [project]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000000',
        color: '#9e5959'
      }}
    >
      {/* Visual Scene Sequence */}
      {timeline.computedScenes.map((computed) => (
        <Sequence
          key={computed.scene.id}
          from={computed.startFrame}
          durationInFrames={computed.durationInFrames}
          name={computed.scene.id}
        >
          <SceneRenderer computed={computed} />
        </Sequence>
      ))}

      {/* Audio Track Layers */}
      {project.audioTracks &&
        project.audioTracks.map((track) => (
          <AudioLayer key={track.id} track={track} />
        ))}
    </AbsoluteFill>
  );
};
