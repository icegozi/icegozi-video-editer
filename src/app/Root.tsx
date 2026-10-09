import React from 'react';
import { Composition } from 'remotion';
import { MainVideo } from '../video/compositions/MainVideo/MainVideo';
import { MAIN_VIDEO_COMPOSITION } from './compositions';
import { registerBuiltInScenes } from './registerCompositions';

// Ensure built-in scene components are registered in SceneRegistry
registerBuiltInScenes();

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id={MAIN_VIDEO_COMPOSITION.id}
        component={MainVideo}
        durationInFrames={MAIN_VIDEO_COMPOSITION.durationInFrames}
        fps={MAIN_VIDEO_COMPOSITION.fps}
        width={MAIN_VIDEO_COMPOSITION.width}
        height={MAIN_VIDEO_COMPOSITION.height}
        defaultProps={MAIN_VIDEO_COMPOSITION.defaultProps}
      />
    </>
  );
};
