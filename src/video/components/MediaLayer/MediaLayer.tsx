import React from 'react';
import { AbsoluteFill, Video, Img, staticFile } from 'remotion';

export interface MediaLayerProps {
  src: string;
  type: 'video' | 'image';
  objectFit?: 'cover' | 'contain' | 'fill';
  scale?: number;
  opacity?: number;
  volume?: number;
  playbackRate?: number;
  startFromFrame?: number;
  style?: React.CSSProperties;
}

/**
 * Handles rendering video or static image assets with precise geometric scaling and opacity.
 */
export const MediaLayer: React.FC<MediaLayerProps> = ({
  src,
  type,
  objectFit = 'cover',
  scale = 1,
  opacity = 1,
  volume = 1,
  playbackRate = 1,
  startFromFrame = 0,
  style,
}) => {
  // Resolve source: if it doesn't start with http/data/file, wrap in staticFile for Remotion public serving
  const resolvedSrc = src.startsWith('http') || src.startsWith('data:') || src.startsWith('/')
    ? src
    : staticFile(src);

  const layerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit,
    transform: `scale(${scale})`,
    opacity,
    ...style,
  };

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {type === 'video' ? (
        <Video
          src={resolvedSrc}
          volume={volume}
          playbackRate={playbackRate}
          startFrom={startFromFrame}
          style={layerStyle}
        />
      ) : (
        <Img src={resolvedSrc} style={layerStyle} />
      )}
    </AbsoluteFill>
  );
};
