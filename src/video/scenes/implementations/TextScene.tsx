import React from 'react';
import { TextSceneConfig } from '../../../domain/video/Scene';
import { SceneComponentProps } from '../SceneRegistry';
import { TextOverlay } from '../../components/TextOverlay/TextOverlay';
import { VideoFrame } from '../../components/VideoFrame/VideoFrame';

export const TextScene: React.FC<SceneComponentProps<TextSceneConfig>> = ({ scene }) => {
  return (
    <VideoFrame backgroundColor={scene.backgroundColor || '#0A0A0C'}>
      <TextOverlay
        title={scene.title}
        subtitle={scene.subtitle}
        textColor={scene.textColor || '#FFFFFF'}
        animationType={scene.animationType || 'fade'}
      />
    </VideoFrame>
  );
};
