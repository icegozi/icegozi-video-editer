import { describe, it, expect } from 'vitest';
import {
  editorReducer,
  createInitialState,
  EditorAction,
} from '../../src/editor/state/editorStore';
import { VideoProject } from '../../src/domain/video/VideoProject';
import { VideoSceneConfig } from '../../src/domain/video/Scene';

describe('Editor Store & Reducer Invariants (Findings I2, I3)', () => {
  const sampleVideoProject: VideoProject = {
    id: 'test-video-project',
    title: 'Test Video Project',
    fps: 30,
    width: 1920,
    height: 1080,
    scenes: [
      {
        id: 'scene-video-1',
        type: 'video',
        src: 'assets/video/intro.mp4',
        durationInFrames: 120, // 4 seconds
        startFromFrame: 30, // Starts at source frame 30
        playbackRate: 2, // 2x speed
      } as VideoSceneConfig,
    ],
  };

  it('calculates consumed source frames on split with playbackRate 2 (Finding I2)', () => {
    const initialState = createInitialState(sampleVideoProject);

    // Split at timeline frame 60 (offset 60 frames into scene)
    const splitAction: EditorAction = {
      type: 'SPLIT_SCENE',
      sceneId: 'scene-video-1',
      atFrame: 60,
      newSceneId: 'scene-video-1-part2',
    };

    const nextState = editorReducer(initialState, splitAction);

    expect(nextState.project.scenes).toHaveLength(2);

    const part1 = nextState.project.scenes[0] as VideoSceneConfig;
    const part2 = nextState.project.scenes[1] as VideoSceneConfig;

    // Part 1: duration = 60, starts at source frame 30
    expect(part1.durationInFrames).toBe(60);
    expect(part1.startFromFrame).toBe(30);

    // Part 2: consumed source frames = 60 * 2 = 120 frames
    // next startFromFrame = 30 + 120 = 150 frames!
    expect(part2.durationInFrames).toBe(60);
    expect(part2.startFromFrame).toBe(150);

    // Total duration is preserved: 60 + 60 = 120 frames
    expect(nextState.timeline.totalDurationInFrames).toBe(120);

    // Selection is updated to the newly created part 2
    expect(nextState.selectedClipId).toBe('scene-video-1-part2');
  });

  it('calculates consumed source frames on split with playbackRate 0.5', () => {
    const projectWithSlowRate: VideoProject = {
      ...sampleVideoProject,
      scenes: [
        {
          id: 'scene-slow',
          type: 'video',
          src: 'assets/video/slow.mp4',
          durationInFrames: 100,
          startFromFrame: 10,
          playbackRate: 0.5,
        } as VideoSceneConfig,
      ],
    };

    const initialState = createInitialState(projectWithSlowRate);
    const splitAction: EditorAction = {
      type: 'SPLIT_SCENE',
      sceneId: 'scene-slow',
      atFrame: 40,
      newSceneId: 'scene-slow-part2',
    };

    const nextState = editorReducer(initialState, splitAction);
    const part2 = nextState.project.scenes[1] as VideoSceneConfig;

    // Consumed source frames = 40 * 0.5 = 20 frames
    // Next startFromFrame = 10 + 20 = 30
    expect(part2.startFromFrame).toBe(30);
    expect(part2.durationInFrames).toBe(60);
  });

  it('reconciles currentFrame and selection on seek, shrink, and delete (Finding I3)', () => {
    const multiSceneProject: VideoProject = {
      ...sampleVideoProject,
      scenes: [
        { id: 's1', type: 'text', durationInFrames: 60, title: 'S1' },
        { id: 's2', type: 'text', durationInFrames: 60, title: 'S2' },
      ],
    };

    let state = createInitialState(multiSceneProject);
    // Total duration = 120 frames (frames 0..119)

    // Seek to frame 119
    state = editorReducer(state, { type: 'SET_CURRENT_FRAME', frame: 119 });
    expect(state.currentFrame).toBe(119);

    // Seek beyond total frames should clamp to maxFrame (119)
    state = editorReducer(state, { type: 'SET_CURRENT_FRAME', frame: 500 });
    expect(state.currentFrame).toBe(119);

    // Select second scene
    state = editorReducer(state, { type: 'SET_SELECTED_CLIP', clipId: 's2' });
    expect(state.selectedClipId).toBe('s2');

    // Delete second scene: total duration becomes 60 (frames 0..59)
    state = editorReducer(state, { type: 'DELETE_SCENE', sceneId: 's2' });

    // currentFrame must be clamped within [0, 59]
    expect(state.currentFrame).toBe(59);

    // selectedClipId must be reconciled to remaining scene 's1'
    expect(state.selectedClipId).toBe('s1');
  });

  it('reconciles state invariants across undo and redo', () => {
    const multiSceneProject: VideoProject = {
      ...sampleVideoProject,
      scenes: [
        { id: 's1', type: 'text', durationInFrames: 60, title: 'S1' },
        { id: 's2', type: 'text', durationInFrames: 60, title: 'S2' },
      ],
    };

    let state = createInitialState(multiSceneProject);

    // Delete s2
    state = editorReducer(state, { type: 'DELETE_SCENE', sceneId: 's2' });
    expect(state.project.scenes).toHaveLength(1);

    // Undo
    state = editorReducer(state, { type: 'UNDO' });
    expect(state.project.scenes).toHaveLength(2);
    expect(state.project.scenes.map((s) => s.id)).toEqual(['s1', 's2']);

    // Redo
    state = editorReducer(state, { type: 'REDO' });
    expect(state.project.scenes).toHaveLength(1);
    expect(state.selectedClipId).toBe('s1');
  });

  describe('C2: Manual edits validation transactions and error state (T3)', () => {
    it('rejects duration update when transition equals scene duration without crash', () => {
      const projectWithFade: VideoProject = {
        ...sampleVideoProject,
        scenes: [
          {
            id: 'scene-fade',
            type: 'text',
            durationInFrames: 120,
            title: 'Fade Scene',
            transition: { type: 'fade', durationInFrames: 15 },
          },
        ],
      };

      const initialState = createInitialState(projectWithFade);
      const revBefore = initialState.revision;

      // Attempt to update duration to 15 (which equals fade transition 15)
      const nextState = editorReducer(initialState, {
        type: 'UPDATE_SCENE',
        sceneId: 'scene-fade',
        updates: { durationInFrames: 15 },
      });

      // Must not throw or crash; must retain state and revision
      expect(nextState.project).toEqual(initialState.project);
      expect(nextState.revision).toBe(revBefore);
      expect(nextState.editError).toBeTruthy();
    });

    it('rejects split too close to transition boundary without crashing', () => {
      const projectWithTransition: VideoProject = {
        ...sampleVideoProject,
        scenes: [
          {
            id: 'scene-1',
            type: 'text',
            title: 'Scene 1',
            durationInFrames: 60,
            transition: { type: 'crossfade', durationInFrames: 15 },
          },
          {
            id: 'scene-2',
            type: 'text',
            title: 'Scene 2',
            durationInFrames: 60,
          },
        ],
      };

      const state = createInitialState(projectWithTransition);
      // Split at frame 50 (within 10 frames of 60, where outgoing transition is 15f)
      const nextState = editorReducer(state, {
        type: 'SPLIT_SCENE',
        sceneId: 'scene-1',
        atFrame: 50,
      });

      expect(nextState.editError).toMatch(/quá ngắn so với outgoing transition/);
      expect(nextState.project.scenes).toHaveLength(2);
    });

    it('LOAD_PROJECT gracefully rejects invalid timeline without white-screening', () => {
      const state = createInitialState(sampleVideoProject);
      const invalidProject: VideoProject = {
        ...sampleVideoProject,
        scenes: [
          {
            id: 's1',
            type: 'text',
            title: 'S1',
            durationInFrames: 100,
            transition: { type: 'crossfade', durationInFrames: 80 },
          },
          {
            id: 's2',
            type: 'text',
            title: 'S2',
            durationInFrames: 30, // 80 > 30!
          },
        ],
      };

      const nextState = editorReducer(state, {
        type: 'LOAD_PROJECT',
        project: invalidProject,
      });

      // Must retain current state with error message, not white screen
      expect(nextState.project.id).toBe(sampleVideoProject.id);
      expect(nextState.editError).toBeTruthy();
    });
  });

  describe('I4: Split scene transition semantics (T8)', () => {
    it('preserves outgoing crossfade only on second half and maintains exact timeline duration', () => {
      const crossfadeProject: VideoProject = {
        ...sampleVideoProject,
        scenes: [
          {
            id: 'scene-a',
            type: 'text',
            durationInFrames: 120,
            title: 'Scene A',
            transition: { type: 'crossfade', durationInFrames: 15 },
          },
          {
            id: 'scene-b',
            type: 'text',
            durationInFrames: 120,
            title: 'Scene B',
          },
        ],
      };

      // Before split: 120 + 120 - 15 = 225 frames
      const state = createInitialState(crossfadeProject);
      expect(state.timeline.totalDurationInFrames).toBe(225);

      // Split scene-a at 60 frames
      const splitState = editorReducer(state, {
        type: 'SPLIT_SCENE',
        sceneId: 'scene-a',
        atFrame: 60,
        newSceneId: 'scene-a-part2',
      });

      expect(splitState.project.scenes).toHaveLength(3);
      const [part1, part2, sceneB] = splitState.project.scenes;

      // Part 1: duration = 60, NO outgoing transition!
      expect(part1.durationInFrames).toBe(60);
      expect(part1.transition).toBeUndefined();

      // Part 2: duration = 60, retains original outgoing crossfade (15 frames)
      expect(part2.durationInFrames).toBe(60);
      expect(part2.transition).toEqual({ type: 'crossfade', durationInFrames: 15 });

      // Total timeline duration must remain EXACTLY 225 frames!
      // 60 (part1) + 60 (part2) - 15 (crossfade) + 120 (sceneB) = 225 frames
      expect(splitState.timeline.totalDurationInFrames).toBe(225);
    });
  });

  describe('I6: Track locking prevents manual mutations (T10)', () => {
    it('blocks UPDATE, DELETE, SPLIT on locked tracks and allows edits after unlocking', () => {
      const lockedProject: VideoProject = {
        ...sampleVideoProject,
        trackSettings: {
          V1: { locked: true, hidden: false },
        },
        scenes: [
          { id: 's1', type: 'text', durationInFrames: 60, title: 'Scene 1' },
          { id: 's2', type: 'text', durationInFrames: 60, title: 'Scene 2' },
        ],
      };

      let state = createInitialState(lockedProject);
      const revBefore = state.revision;

      // 1. UPDATE on locked scene: rejected!
      state = editorReducer(state, {
        type: 'UPDATE_SCENE',
        sceneId: 's1',
        updates: { title: 'Modified Scene 1' },
      });
      expect(state.editError).toMatch(/track.*đang khóa/i);
      expect((state.project.scenes[0] as any).title).toBe('Scene 1');
      expect(state.revision).toBe(revBefore);

      // 2. DELETE on locked scene: rejected!
      state = editorReducer(state, {
        type: 'DELETE_SCENE',
        sceneId: 's1',
      });
      expect(state.editError).toMatch(/track.*đang khóa/i);
      expect(state.project.scenes).toHaveLength(2);

      // 3. SPLIT on locked scene: rejected!
      state = editorReducer(state, {
        type: 'SPLIT_SCENE',
        sceneId: 's1',
        atFrame: 30,
      });
      expect(state.editError).toMatch(/track.*đang khóa/i);
      expect(state.project.scenes).toHaveLength(2);

      // 4. Unlock track V1
      state = editorReducer(state, {
        type: 'SET_TRACK_SETTING',
        trackId: 'V1',
        setting: { locked: false },
      });
      expect(state.project.trackSettings?.V1?.locked).toBe(false);

      // 5. UPDATE now succeeds!
      state = editorReducer(state, {
        type: 'UPDATE_SCENE',
        sceneId: 's1',
        updates: { title: 'Successfully Updated' },
      });
      expect((state.project.scenes[0] as any).title).toBe('Successfully Updated');
      expect(state.editError).toBeNull();
    });
  });
});
