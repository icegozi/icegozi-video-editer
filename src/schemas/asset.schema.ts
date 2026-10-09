import { z } from 'zod';

export const MediaMetadataSchema = z.object({
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  durationInSeconds: z.number().nonnegative(),
  fps: z.number().positive().optional(),
  videoCodec: z.string().optional(),
  audioCodec: z.string().optional(),
  sampleRate: z.number().positive().optional(),
  channels: z.number().positive().optional(),
  pixelFormat: z.string().optional(),
  bitrate: z.number().positive().optional(),
});

export const MediaAssetSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  type: z.enum(['video', 'audio', 'image', 'font', 'subtitle']),
  isNormalized: z.boolean().optional(),
  metadata: MediaMetadataSchema.optional(),
});
