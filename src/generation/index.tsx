import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { GeneratedScene } from '../video/compositions/GeneratedScene/GeneratedScene';
import { CoreSceneSchema } from '../application/scene-generation/coreScene.schema';

const defaults = {
  sceneSpec: CoreSceneSchema.parse({
    nodes: [{ id: 'title', type: 'text', text: 'ICEGOZI', x: 640, y: 360 }],
  }),
  width: 1280,
  height: 720,
  fps: 30,
  durationInFrames: 150,
};
const CoreRoot = () => (
  <Composition
    id="GeneratedScene"
    component={GeneratedScene}
    width={1280}
    height={720}
    fps={30}
    durationInFrames={150}
    defaultProps={defaults}
    calculateMetadata={({ props }) => ({
      width: props.width,
      height: props.height,
      fps: props.fps,
      durationInFrames: props.durationInFrames,
    })}
  />
);
registerRoot(CoreRoot);
