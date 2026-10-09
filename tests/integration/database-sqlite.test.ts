import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectDbService } from '../../src/infrastructure/db/projectDbService';
import { VideoProject } from '../../src/domain/video/VideoProject';
import { mockProject } from '../fixtures/mock-project';
import { db } from '../../src/infrastructure/db/client';
import { projects, projectSnapshots } from '../../src/infrastructure/db/schema/projects';
import { renderJobs } from '../../src/infrastructure/db/schema/renderJobs';
import { eq } from 'drizzle-orm';

describe('SQLite Database & Timeline Snapshot Persistence', () => {
  const testProject: VideoProject = {
    ...mockProject,
    id: `proj-test-${Date.now()}`,
    title: 'Test SQLite Video Project',
    scenes: [
      {
        id: 'scene-sq-1',
        type: 'text',
        durationInFrames: 90,
        title: 'Title in SQLite',
      },
      {
        id: 'scene-sq-2',
        type: 'video',
        durationInFrames: 60,
        src: 'assets/sample.mp4',
        startFromFrame: 0,
      },
    ],
    audioTracks: [
      {
        id: 'audio-sq-1',
        type: 'music',
        src: 'assets/music.mp3',
        startFrame: 0,
        volume: 0.8,
      },
    ],
    subtitles: [
      {
        id: 'sub-sq-1',
        startMs: 0,
        endMs: 3000,
        text: 'Hello SQLite',
      },
    ],
  };

  it('saves a new project and creates revision 1 snapshot', () => {
    const result = ProjectDbService.saveProject(testProject);

    expect(result.revision).toBe(1);
    expect(result.savedAt).toBeGreaterThan(0);

    const retrieved = ProjectDbService.getProject(testProject.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(testProject.id);
    expect(retrieved?.title).toBe('Test SQLite Video Project');
    expect(retrieved?.scenes.length).toBe(2);
    expect(retrieved?.audioTracks?.length).toBe(1);
    expect(retrieved?.subtitles?.length).toBe(1);
  });

  it('updates an existing project and increments revision to 2', () => {
    const updated: VideoProject = {
      ...testProject,
      title: 'Updated SQLite Video Title',
    };

    const result = ProjectDbService.saveProject(updated, { revision: 1 });
    expect(result.revision).toBe(2);

    const retrieved = ProjectDbService.getProject(testProject.id);
    expect(retrieved?.title).toBe('Updated SQLite Video Title');

    // Verify 2 snapshots exist in project_snapshots table
    const snapshots = db
      .select()
      .from(projectSnapshots)
      .where(eq(projectSnapshots.projectId, testProject.id))
      .all();
    expect(snapshots.length).toBe(2);
  });

  it('rejects stale out-of-order writes', () => {
    // Current revision is 2. Attempting to write with stale revision 0 must throw.
    expect(() => {
      ProjectDbService.saveProject(testProject, { revision: 0 });
    }).toThrow(/Stale revision conflict/);
  });

  it('lists existing projects in updated_at descending order', () => {
    const list = ProjectDbService.listProjects();
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((p) => p.id === testProject.id)).toBe(true);
  });

  it('deletes project and cascades to snapshots', () => {
    const deleted = ProjectDbService.deleteProject(testProject.id);
    expect(deleted).toBe(true);

    const retrieved = ProjectDbService.getProject(testProject.id);
    expect(retrieved).toBeNull();

    const remainingSnapshots = db
      .select()
      .from(projectSnapshots)
      .where(eq(projectSnapshots.projectId, testProject.id))
      .all();
    expect(remainingSnapshots.length).toBe(0);
  });
});
