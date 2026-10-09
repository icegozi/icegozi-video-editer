import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderService } from '../../src/application/render/renderService';
import { RenderProfile } from '../../src/config/render.config';
import { mockProject } from '../fixtures/mock-project';
import { VideoProject } from '../../src/domain/video/VideoProject';
import fs from 'node:fs';

describe('Render Service & Job Lifecycle (Finding I1)', () => {
  const customProject: VideoProject = {
    ...mockProject,
    id: 'custom-export-snapshot',
    title: 'Custom User Snapshot Video',
    scenes: [
      {
        id: 'scene-custom-1',
        type: 'text',
        durationInFrames: 120,
        title: 'Custom Title',
      },
    ],
  };

  it('creates an isolated render job with immutable snapshot distinct from demo project', () => {
    const job = renderService.createJob(customProject, RenderProfile.Preview);

    expect(job.id).toBeDefined();
    expect(job.projectTitle).toBe('Custom User Snapshot Video');
    expect(job.profile).toBe(RenderProfile.Preview);
    expect(job.outputPath).toContain('custom_user_snapshot_video');
    expect(job.status === 'queued' || job.status === 'rendering').toBe(true);
  });

  it('retrieves created jobs via getJob and listJobs', () => {
    const job = renderService.createJob(customProject, RenderProfile.Preview);
    const retrieved = renderService.getJob(job.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(job.id);

    const allJobs = renderService.listJobs();
    expect(allJobs.some((j) => j.id === job.id)).toBe(true);
  });

  it('cancels an active render job safely', () => {
    const job = renderService.createJob(customProject, RenderProfile.Preview);
    const cancelled = renderService.cancelJob(job.id);

    expect(cancelled).toBe(true);
    expect(job.status).toBe('cancelled');
    expect(job.error).toContain('cancelled');
  });

  it('rejects malformed project definitions with descriptive validation error', () => {
    const invalidProject = {
      title: 'Missing required ID and scenes',
    };

    expect(() => {
      renderService.createJob(invalidProject as any, RenderProfile.Preview);
    }).toThrow();
  });
});
