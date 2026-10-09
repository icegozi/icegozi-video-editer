import React from 'react';
import { SceneConfig } from '../../domain/video/Scene';
import { ComputedScene } from '../../domain/video/Timeline';
import { SceneRegistry } from './SceneRegistry';
import { Fade } from '../transitions/Fade';
import { CrossFade } from '../transitions/CrossFade';

export interface SceneRendererProps {
  computed: ComputedScene<SceneConfig>;
}

/**
 * Dispatches a computed scene to its registered React component.
 * Applies transition wrappers when transition rules are defined on the scene.
 */
export const SceneRenderer: React.FC<SceneRendererProps> = ({ computed }) => {
  const { scene, durationInFrames } = computed;
  const Component = SceneRegistry.get(scene.type);

  const renderedContent = <Component scene={scene} computed={computed} />;

  if (!scene.transition || scene.transition.type === 'none') {
    return renderedContent;
  }

  const transitionDuration = scene.transition.durationInFrames;

  if (scene.transition.type === 'fade') {
    return (
      <Fade durationInFrames={transitionDuration} totalDurationInFrames={durationInFrames} type="both">
        {renderedContent}
      </Fade>
    );
  }

  if (scene.transition.type === 'crossfade') {
    return (
      <CrossFade durationInFrames={transitionDuration} totalDurationInFrames={durationInFrames}>
        {renderedContent}
      </CrossFade>
    );
  }

  return renderedContent;
};
