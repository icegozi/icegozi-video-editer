import React from 'react';
import { Composition } from 'remotion';
import { MainVideo } from '../video/compositions/MainVideo/MainVideo';
import { MAIN_VIDEO_COMPOSITION } from './compositions';
import { registerBuiltInScenes } from './registerCompositions';

import { buildTimeline } from '../application/timeline/buildTimeline';
import { migrateProject } from '../schemas/project.schema';

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
        calculateMetadata={({ props }) => {
          const rawProject = props?.project ?? MAIN_VIDEO_COMPOSITION.defaultProps.project;
          const project = migrateProject(rawProject);
          const timeline = buildTimeline(project);
          return {
            durationInFrames: Math.max(1, timeline.totalDurationInFrames),
            fps: project.fps,
            width: project.width,
            height: project.height,
          };
        }}
      />
    </>
  );
};

