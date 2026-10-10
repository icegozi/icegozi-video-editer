import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectDbService } from '../../src/infrastructure/db/projectDbService';
import { ProjectStorage } from '../../src/infrastructure/storage/ProjectStorage';
import { VideoProject } from '../../src/domain/video/VideoProject';
import { mockProject } from '../fixtures/mock-project';
import { editorReducer, createInitialState } from '../../src/editor/state/editorStore';

describe('Project Persistence Synchronization & CAS (Findings I1, I2 / T4, T5)', () => {
  const syncProject: VideoProject = {
    ...mockProject,
    id: `sync-proj-${Date.now()}`,
    title: 'Sync Test Video Project',
    scenes: [
      {
        id: 'scene-s1',
        type: 'text',
        durationInFrames: 60,
        title: 'Initial Title',
      },
    ],
  };

  it('idempotently handles repeated saves of identical content without incrementing revision (T4)', () => {
    // 1. Initial save creates revision 1
    const res1 = ProjectDbService.saveProject(syncProject);
    expect(res1.revision).toBe(1);

    // 2. Second save with identical project content should be idempotent and return revision 1
    const res2 = ProjectDbService.saveProject(syncProject, { revision: 1 });
    expect(res2.revision).toBe(1);
    expect(res2.idempotent).toBe(true);

    // 3. Modifying project content increments to revision 2
    const modified: VideoProject = {
      ...syncProject,
      scenes: [
        {
          ...(syncProject.scenes[0] as any),
          title: 'Modified Title',
        },
      ],
    };

    const res3 = ProjectDbService.saveProject(modified, { expectedServerRevision: 1 });
    expect(res3.revision).toBe(2);
  });

  it('creating render snapshot does not advance edited project revision counter or cause false stale conflict (T4)', () => {
    const projId = `render-snapshot-proj-${Date.now()}`;
    const proj: VideoProject = { ...syncProject, id: projId, title: 'Render Snapshot Project' };

    // 1. Save project at revision 1
    const save1 = ProjectDbService.saveProject(proj);
    expect(save1.revision).toBe(1);

    // 2. Create render snapshot
    const renderSnap = ProjectDbService.createRenderSnapshot(proj);
    expect(renderSnap.revision).toBe(1);
    expect(renderSnap.snapshotId).toBeDefined();

    // 3. Verify server project is still at revision 1
    const retrieved = ProjectDbService.getProject(projId);
    expect(retrieved?.metadata?.currentRevision).toBe(1);

    // 4. Editor subsequently saves revision 2 against expectedServerRevision 1: MUST SUCCEED without stale conflict!
    const edit2: VideoProject = {
      ...proj,
      title: 'Edited after render preview',
    };
    const save2 = ProjectDbService.saveProject(edit2, { expectedServerRevision: 1 });
    expect(save2.revision).toBe(2);
  });

  it('rejects stale expected server revision with conflict error (T4)', () => {
    const projId = `stale-proj-${Date.now()}`;
    const proj: VideoProject = { ...syncProject, id: projId };

    ProjectDbService.saveProject(proj); // rev 1
    const modified: VideoProject = { ...proj, title: 'Rev 2 Title' };
    ProjectDbService.saveProject(modified, { expectedServerRevision: 1 }); // rev 2

    // Attempting to save with expected revision 1 when server is at rev 2:
    const staleEdit: VideoProject = { ...proj, title: 'Stale Edit Title' };
    expect(() => {
      ProjectDbService.saveProject(staleEdit, { expectedServerRevision: 1 });
    }).toThrow(/Stale revision conflict/);
  });

  it('detects multi-tab conflict when another tab saved a newer revision to storage (T5)', async () => {
    const proj: VideoProject = { ...syncProject, id: `multi-tab-${Date.now()}` };

    // Tab 1 saves rev 1
    await ProjectStorage.saveProject(proj, 1);

    // Tab 2 saves rev 2 to shared storage
    ProjectStorage.simulateExternalStorageRevision(2);

    // Tab 1 attempts to save rev 1: must be rejected with conflict!
    await expect(ProjectStorage.saveProject(proj, 1)).rejects.toThrow(/Stale write conflict/);
  });

  it('does not mark state as saved if user edited while async save was in flight (T5)', () => {
    let state = createInitialState(syncProject);
    expect(state.revision).toBe(1);
    expect(state.saveStatus).toBe('saved');

    // 1. User makes edit -> revision 2, dirty
    state = editorReducer(state, {
      type: 'UPDATE_SCENE',
      sceneId: 'scene-s1',
      updates: { title: 'Edit Rev 2' },
    });
    expect(state.revision).toBe(2);
    expect(state.saveStatus).toBe('dirty');

    // 2. Save starts for revision 2
    state = editorReducer(state, { type: 'SET_SAVE_STATUS', status: 'saving' });
    expect(state.saveStatus).toBe('saving');

    // 3. User makes another edit while save is in flight -> revision 3, dirty
    state = editorReducer(state, {
      type: 'UPDATE_SCENE',
      sceneId: 'scene-s1',
      updates: { title: 'Edit Rev 3 while saving' },
    });
    expect(state.revision).toBe(3);
    expect(state.saveStatus).toBe('dirty');

    // 4. Save for revision 2 completes -> dispatch saved with revision: 2
    state = editorReducer(state, {
      type: 'SET_SAVE_STATUS',
      status: 'saved',
      revision: 2,
    });

    // CRITICAL: saveStatus must REMAIN 'dirty' because state.revision (3) > saved revision (2)!
    expect(state.saveStatus).toBe('dirty');
  });
});
