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
});
