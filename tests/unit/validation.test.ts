import { describe, it, expect } from 'vitest';
import { VideoProjectSchema } from '../../src/schemas/project.schema';
import { mockProject } from '../fixtures/mock-project';

describe('Project Schema Validation', () => {
  it('successfully validates a well-formed project', () => {
    const parseResult = VideoProjectSchema.safeParse(mockProject);
    expect(parseResult.success).toBe(true);
  });

  it('fails validation when required fields are missing', () => {
    const invalid = {
      ...mockProject,
      fps: -10, // Invalid FPS
    };
    const parseResult = VideoProjectSchema.safeParse(invalid);
    expect(parseResult.success).toBe(false);
  });

  it('fails validation when scenes array is empty', () => {
    const emptyScenes = {
      ...mockProject,
      scenes: [],
    };
    const parseResult = VideoProjectSchema.safeParse(emptyScenes);
    expect(parseResult.success).toBe(false);
  });

  it('fails validation when scene IDs are duplicated (Finding I11)', () => {
    const duplicateSceneProject = {
      ...mockProject,
      scenes: [
        { ...mockProject.scenes[0], id: 'scene-dup' },
        { ...mockProject.scenes[1], id: 'scene-dup' },
      ],
    };
    const parseResult = VideoProjectSchema.safeParse(duplicateSceneProject);
    expect(parseResult.success).toBe(false);
    if (!parseResult.success) {
      expect(parseResult.error.issues.some((issue) => issue.message.includes('Duplicate scene ID'))).toBe(true);
    }
  });

  it('fails validation when audio track IDs are duplicated (Finding I11)', () => {
    const duplicateAudioProject = {
      ...mockProject,
      audioTracks: [
        { id: 'audio-1', type: 'voice' as const, src: 'a.mp3', startFrame: 0, volume: 1 },
        { id: 'audio-1', type: 'music' as const, src: 'b.mp3', startFrame: 30, volume: 0.5 },
      ],
    };
    const parseResult = VideoProjectSchema.safeParse(duplicateAudioProject);
    expect(parseResult.success).toBe(false);
    if (!parseResult.success) {
      expect(parseResult.error.issues.some((issue) => issue.message.includes('Duplicate audio track ID'))).toBe(true);
    }
  });
});

