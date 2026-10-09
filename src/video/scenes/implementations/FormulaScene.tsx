import React from 'react';
import { FormulaSceneConfig } from '../../../domain/video/Scene';
import { SceneComponentProps } from '../SceneRegistry';
import { FormulaOverlay } from '../../components/FormulaOverlay/FormulaOverlay';
import { VideoFrame } from '../../components/VideoFrame/VideoFrame';

export const FormulaScene: React.FC<SceneComponentProps<FormulaSceneConfig>> = ({ scene }) => {
  return (
    <VideoFrame backgroundColor={scene.backgroundColor || '#0B0F19'}>
      <FormulaOverlay
        latex={scene.latex}
        title={scene.title}
        explanation={scene.explanation}
        fontSize={scene.fontSize}
        textColor={scene.textColor}
      />
    </VideoFrame>
  );
};
