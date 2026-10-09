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
});
