import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { ImageSceneConfig } from '../../../domain/video/Scene';
import { SceneComponentProps } from '../SceneRegistry';
import { MediaLayer } from '../../components/MediaLayer/MediaLayer';
import { VideoFrame } from '../../components/VideoFrame/VideoFrame';

export const ImageScene: React.FC<SceneComponentProps<ImageSceneConfig>> = ({ scene, computed }) => {
  const frame = useCurrentFrame();

  const scale = scene.zoomAnimation
    ? interpolate(frame, [0, computed.durationInFrames], [1, 1.08], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 1;

  return (
    <VideoFrame>
      <MediaLayer
        src={scene.src}
        type="image"
        objectFit={scene.objectFit || 'cover'}
        scale={scale}
      />
    </VideoFrame>
  );
};
