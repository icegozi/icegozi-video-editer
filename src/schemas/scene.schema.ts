import { z } from 'zod';

export const TransitionConfigSchema = z.object({
  type: z.enum(['none', 'fade', 'crossfade']),
  durationInFrames: z.number().int().positive(),
});

const BaseSceneSchema = z.object({
  id: z.string().min(1),
  durationInFrames: z.number().int().positive(),
  transition: TransitionConfigSchema.optional(),
});

export const VideoSceneSchema = BaseSceneSchema.extend({
  type: z.literal('video'),
  src: z.string().min(1),
  volume: z.number().min(0).max(1).optional(),
  playbackRate: z.number().positive().optional(),
  startFromFrame: z.number().int().nonnegative().optional(),
  objectFit: z.enum(['cover', 'contain', 'fill']).optional(),
});

export const ImageSceneSchema = BaseSceneSchema.extend({
  type: z.literal('image'),
  src: z.string().min(1),
  objectFit: z.enum(['cover', 'contain', 'fill']).optional(),
  zoomAnimation: z.boolean().optional(),
});

export const TextSceneSchema = BaseSceneSchema.extend({
  type: z.literal('text'),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  animationType: z.enum(['fade', 'slide-up', 'typewriter', 'scale']).optional(),
  fontSize: z.number().min(8).max(512).optional(),
  startScale: z.number().min(0.01).max(20).optional(),
  endScale: z.number().min(0.01).max(20).optional(),
});

export const FormulaSceneSchema = BaseSceneSchema.extend({
  type: z.literal('formula'),
  latex: z.string().min(1),
  title: z.string().optional(),
  explanation: z.string().optional(),
  fontSize: z.number().positive().optional(),
  textColor: z.string().optional(),
  backgroundColor: z.string().optional(),
});

export const CompositionSceneSchema = BaseSceneSchema.extend({
  type: z.literal('composition'),
  componentName: z.string().min(1),
  props: z.record(z.string(), z.unknown()).optional(),
});

export const SceneConfigSchema = z.discriminatedUnion('type', [
  VideoSceneSchema,
  ImageSceneSchema,
  TextSceneSchema,
  FormulaSceneSchema,
  CompositionSceneSchema,
]);
