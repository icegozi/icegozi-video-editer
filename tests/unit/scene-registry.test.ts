import { describe, it, expect } from 'vitest';
import React from 'react';
import { SceneRegistry } from '../../src/video/scenes/SceneRegistry';
import { UnknownSceneTypeError } from '../../src/shared/errors/pipelineErrors';
import { registerBuiltInScenes } from '../../src/app/registerCompositions';

describe('SceneRegistry', () => {
  it('registers and retrieves built-in scene types', () => {
    registerBuiltInScenes();

    expect(SceneRegistry.has('video')).toBe(true);
    expect(SceneRegistry.has('image')).toBe(true);
    expect(SceneRegistry.has('text')).toBe(true);
    expect(SceneRegistry.has('formula')).toBe(true);
    expect(SceneRegistry.has('composition')).toBe(true);

    const TextComponent = SceneRegistry.get('text');
    expect(TextComponent).toBeDefined();
  });

  it('allows registering custom scene types dynamically', () => {
    const CustomScene: React.FC<any> = () => React.createElement('div', null, 'Custom');
    SceneRegistry.register('custom-3d', CustomScene);

    expect(SceneRegistry.has('custom-3d')).toBe(true);
    expect(SceneRegistry.get('custom-3d')).toBe(CustomScene);
  });

  it('throws UnknownSceneTypeError when retrieving an unregistered scene type', () => {
    expect(() => SceneRegistry.get('non-existent-type')).toThrow(UnknownSceneTypeError);
  });
});
