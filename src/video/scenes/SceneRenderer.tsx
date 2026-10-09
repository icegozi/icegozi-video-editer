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

  // Fade-through-black
  if (scene.transition?.type === 'fade') {
    const transitionDuration = scene.transition.durationInFrames;
    return (
      <Fade durationInFrames={transitionDuration} totalDurationInFrames={durationInFrames} type="both">
        {renderedContent}
      </Fade>
    );
  }

  // Crossfade (incoming and/or outgoing overlap)
  const inCrossfade = computed.incomingTransition?.type === 'crossfade'
    ? computed.incomingTransition.durationInFrames
    : 0;
  const outCrossfade = scene.transition?.type === 'crossfade'
    ? scene.transition.durationInFrames
    : 0;

  if (inCrossfade > 0 || outCrossfade > 0) {
    return (
      <CrossFade
        inDurationInFrames={inCrossfade}
        outDurationInFrames={outCrossfade}
        totalDurationInFrames={durationInFrames}
      >
        {renderedContent}
      </CrossFade>
    );
  }

  return renderedContent;
};

