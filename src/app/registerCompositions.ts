import { SceneRegistry } from '../video/scenes/SceneRegistry';
import { VideoScene } from '../video/scenes/implementations/VideoScene';
import { ImageScene } from '../video/scenes/implementations/ImageScene';
import { TextScene } from '../video/scenes/implementations/TextScene';
import { FormulaScene } from '../video/scenes/implementations/FormulaScene';
import { CompositionScene } from '../video/scenes/implementations/CompositionScene';

let isRegistered = false;

/**
 * Registers all core scene renderers with the SceneRegistry.
 * Safe to call multiple times.
 */
export function registerBuiltInScenes(): void {
  if (isRegistered) return;

  SceneRegistry.register('video', VideoScene);
  SceneRegistry.register('image', ImageScene);
  SceneRegistry.register('text', TextScene);
  SceneRegistry.register('formula', FormulaScene);
  SceneRegistry.register('composition', CompositionScene);

  isRegistered = true;
}
