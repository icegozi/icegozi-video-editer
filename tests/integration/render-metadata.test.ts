import { describe, it, expect } from 'vitest';
import { buildTimeline } from '../../src/application/timeline/buildTimeline';
import { migrateProject } from '../../src/schemas/project.schema';
import { prepareRender } from '../../src/application/render/prepareRender';
import { RenderProfile } from '../../src/config/render.config';
import path from 'node:path';

describe('Render Metadata Calculation & Entry Point Unification (Finding I10)', () => {
  it('correctly calculates dynamic composition metadata for custom project (1080x1920, 60fps, 600f)', () => {
    const portraitProject = {
      id: 'portrait-custom-project',
      title: 'Shorts Portrait Video',
      fps: 60,
      width: 1080,
      height: 1920,
      scenes: [
        {
          id: 'scene-1',
          type: 'text' as const,
          durationInFrames: 300,
          title: 'Portrait Scene 1',
        },
        {
          id: 'scene-2',
          type: 'text' as const,
          durationInFrames: 300,
          title: 'Portrait Scene 2',
        },
      ],
    };

    const validated = migrateProject(portraitProject);
    const timeline = buildTimeline(validated);

    expect(timeline.totalDurationInFrames).toBe(600);
    expect(timeline.fps).toBe(60);
    expect(validated.width).toBe(1080);
    expect(validated.height).toBe(1920);
  });

  it('unifies prepareRender entryFile to src/index.ts', () => {
    const prep = prepareRender('MainVideo', RenderProfile.Preview);
    expect(prep.entryFile).toBe(path.resolve(process.cwd(), 'src', 'index.ts'));
    expect(prep.outputPath).toContain('generated');
    expect(prep.outputPath).toContain('previews');
  });
});
