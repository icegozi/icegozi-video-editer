import { z } from 'zod';
import { SceneConfigSchema } from './scene.schema';

export const AudioTrackConfigSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['voice', 'music', 'sfx']),
  src: z.string().min(1),
  startFrame: z.number().int().nonnegative(),
  durationInFrames: z.number().int().positive().optional(),
  volume: z.number().min(0).max(1),
  fadeInFrames: z.number().int().nonnegative().optional(),
  fadeOutFrames: z.number().int().nonnegative().optional(),
  loop: z.boolean().optional(),
});

export const VideoProjectSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  scenes: z.array(SceneConfigSchema).min(1),
  audioTracks: z.array(AudioTrackConfigSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
