import React from 'react';
import { VideoSceneConfig } from '../../../domain/video/Scene';
import { SceneComponentProps } from '../SceneRegistry';
import { MediaLayer } from '../../components/MediaLayer/MediaLayer';
import { VideoFrame } from '../../components/VideoFrame/VideoFrame';

export const VideoScene: React.FC<SceneComponentProps<VideoSceneConfig>> = ({ scene }) => {
  return (
    <VideoFrame>
      <MediaLayer
        src={scene.src}
        type="video"
        objectFit={scene.objectFit || 'cover'}
        volume={scene.volume ?? 1}
        playbackRate={scene.playbackRate ?? 1}
        startFromFrame={scene.startFromFrame ?? 0}
      />
    </VideoFrame>
  );
};
