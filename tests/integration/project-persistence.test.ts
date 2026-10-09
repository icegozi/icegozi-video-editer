import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectStorage } from '../../src/infrastructure/storage/ProjectStorage';
import { mockProject } from '../fixtures/mock-project';
import { VideoProject } from '../../src/domain/video/VideoProject';

describe('Project Persistence & Recovery (Finding C2)', () => {
  beforeEach(async () => {
    await ProjectStorage.clearCurrentProject();
  });

  it('saves and restores a project accurately', async () => {
    const customProject: VideoProject = {
      ...mockProject,
      title: 'Custom Saved Project',
    };

    const saveResult = await ProjectStorage.saveProject(customProject, 1);
    expect(saveResult.revision).toBe(1);

    const loaded = await ProjectStorage.loadCurrentProject();
    expect(loaded).not.toBeNull();
    expect(loaded?.project.title).toBe('Custom Saved Project');
    expect(loaded?.revision).toBe(1);
  });

  it('prevents an older revision from overwriting a newer revision (out-of-order writes)', async () => {
    const projectRev1: VideoProject = { ...mockProject, title: 'Revision 1' };
    const projectRev2: VideoProject = { ...mockProject, title: 'Revision 2' };

    // Save Revision 2 first
    await ProjectStorage.saveProject(projectRev2, 2);

    // Stale async response from Revision 1 arrives later
    await ProjectStorage.saveProject(projectRev1, 1);

    // State should still be Revision 2
    const loaded = await ProjectStorage.loadCurrentProject();
    expect(loaded?.project.title).toBe('Revision 2');
    expect(loaded?.revision).toBe(2);
  });

  it('exports and imports project JSON with validation and schema migration', () => {
    const jsonString = ProjectStorage.exportProjectJson(mockProject);
    expect(typeof jsonString).toBe('string');

    const imported = ProjectStorage.importProjectJson(jsonString);
    expect(imported.id).toBe(mockProject.id);
    expect(imported.scenes.length).toBe(mockProject.scenes.length);
  });

  it('rejects corrupt JSON on import', () => {
    expect(() => {
      ProjectStorage.importProjectJson('{ corrupt json here ...');
    }).toThrow(/Invalid JSON format/);
  });

  it('clears persisted project and returns null', async () => {
    await ProjectStorage.saveProject(mockProject, 1);
    await ProjectStorage.clearCurrentProject();

    const loaded = await ProjectStorage.loadCurrentProject();
    expect(loaded).toBeNull();
  });
});
