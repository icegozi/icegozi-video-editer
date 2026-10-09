import React from 'react';
import { CompositionSceneConfig } from '../../../domain/video/Scene';
import { SceneComponentProps } from '../SceneRegistry';
import { VideoFrame } from '../../components/VideoFrame/VideoFrame';

export const CompositionScene: React.FC<SceneComponentProps<CompositionSceneConfig>> = ({ scene }) => {
  return (
    <VideoFrame>
      <div style={{ color: '#FFFFFF', textAlign: 'center' }}>
        <h2>Composition: {scene.componentName}</h2>
      </div>
    </VideoFrame>
  );
};
