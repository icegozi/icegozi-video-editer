import { TransitionConfig } from './Transition';

export type SceneType = 'video' | 'image' | 'text' | 'formula' | 'composition';

export interface BaseSceneConfig {
  id: string;
  type: SceneType;
  durationInFrames: number;
  transition?: TransitionConfig;
}

export interface VideoSceneConfig extends BaseSceneConfig {
  type: 'video';
  src: string;
  volume?: number;
  playbackRate?: number;
  startFromFrame?: number;
  objectFit?: 'cover' | 'contain' | 'fill';
}

export interface ImageSceneConfig extends BaseSceneConfig {
  type: 'image';
  src: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  zoomAnimation?: boolean;
}

export interface TextSceneConfig extends BaseSceneConfig {
  type: 'text';
  title: string;
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  animationType?: 'fade' | 'slide-up' | 'typewriter';
}

export interface FormulaSceneConfig extends BaseSceneConfig {
  type: 'formula';
  latex: string;
  title?: string;
  explanation?: string;
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
}

export interface CompositionSceneConfig extends BaseSceneConfig {
  type: 'composition';
  componentName: string;
  props?: Record<string, unknown>;
}

export type SceneConfig =
  | VideoSceneConfig
  | ImageSceneConfig
  | TextSceneConfig
  | FormulaSceneConfig
  | CompositionSceneConfig;
