import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderService } from '../../src/application/render/renderService';
import { RenderProfile } from '../../src/config/render.config';
import { mockProject } from '../fixtures/mock-project';
import { VideoProject } from '../../src/domain/video/VideoProject';
import fs from 'node:fs';
import { spawn } from 'node:child_process';

vi.mock('node:child_process', async () => {
  const { EventEmitter } = await import('node:events');
  const { PassThrough } = await import('node:stream');
  return { spawn: vi.fn(() => {
    const emitter = new EventEmitter();
    return Object.assign(emitter, { stdout: new PassThrough(), stderr: new PassThrough(), killed: false,
      kill() { this.killed = true; emitter.emit('close', 0); return true; },
    });
  }) };
});

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
    const args = vi.mocked(spawn).mock.calls.at(-1)!;
    expect(args[0]).toBe(process.execPath);
    expect(args[2]).toMatchObject({ shell: false, windowsHide: true });
    const renderArgs = args[1] as string[];
    const snapshotArg = renderArgs.find((arg) => arg.startsWith('--props='))!;
    const snapshot = JSON.parse(fs.readFileSync(snapshotArg.slice('--props='.length), 'utf8'));
    expect(snapshot.project.title).toBe(customProject.title);
    expect(renderArgs).toContain('--codec=h264');
    expect(renderArgs).toContain('--pixel-format=yuv420p');
    renderService.cancelJob(job.id);
  });

  it('retrieves created jobs via getJob and listJobs', () => {
    const job = renderService.createJob(customProject, RenderProfile.Preview);
    const retrieved = renderService.getJob(job.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(job.id);

    const allJobs = renderService.listJobs();
    expect(allJobs.some((j) => j.id === job.id)).toBe(true);
    renderService.cancelJob(job.id);
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
