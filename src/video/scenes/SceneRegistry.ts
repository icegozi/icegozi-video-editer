import React from 'react';
import { SceneConfig, SceneType } from '../../domain/video/Scene';
import { ComputedScene } from '../../domain/video/Timeline';
import { UnknownSceneTypeError } from '../../shared/errors/pipelineErrors';

export interface SceneComponentProps<T extends SceneConfig = SceneConfig> {
  scene: T;
  computed: ComputedScene<T>;
}

export type SceneComponent<T extends SceneConfig = SceneConfig> = React.ComponentType<SceneComponentProps<T>>;

class SceneRegistryClass {
  private registry = new Map<string, SceneComponent<any>>();

  /**
   * Registers a scene component for a specific scene type.
   */
  register<T extends SceneConfig>(type: SceneType | string, component: SceneComponent<T>): void {
    this.registry.set(type, component as SceneComponent<any>);
  }

  /**
   * Resolves the component for a scene type or throws UnknownSceneTypeError.
   */
  get<T extends SceneConfig>(type: string): SceneComponent<T> {
    const component = this.registry.get(type);
    if (!component) {
      throw new UnknownSceneTypeError(type);
    }
    return component as SceneComponent<T>;
  }

  /**
   * Checks whether a scene type is registered.
   */
  has(type: string): boolean {
    return this.registry.has(type);
  }

  /**
   * Returns all registered scene types.
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.registry.keys());
  }
}

export const SceneRegistry = new SceneRegistryClass();
