import { z } from 'zod';
import { SceneConfigSchema } from './scene.schema';
import { VideoProject } from '../domain/video/VideoProject';

export const CURRENT_SCHEMA_VERSION = 1;

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

export const SubtitleCueSchema = z.object({
  id: z.string().min(1),
  startMs: z.number().nonnegative(),
  endMs: z.number().positive(),
  text: z.string().min(1),
}).refine((cue) => cue.endMs > cue.startMs, {
  message: 'Subtitle end time must be greater than start time',
  path: ['endMs'],
});

export const TrackSettingSchema = z.object({
  muted: z.boolean().optional(),
  hidden: z.boolean().optional(),
  locked: z.boolean().optional(),
});

export const VideoProjectSchema = z.object({
  schemaVersion: z.number().int().positive().optional().default(CURRENT_SCHEMA_VERSION),
  id: z.string().min(1),
  title: z.string().min(1),
  fps: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  scenes: z.array(SceneConfigSchema).min(1),
  audioTracks: z.array(AudioTrackConfigSchema).optional(),
  subtitles: z.array(SubtitleCueSchema).optional(),
  trackSettings: z.record(z.string(), TrackSettingSchema).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).superRefine((project, context) => {
  const owners = new Map<string, string>();
  const collections = [
    ['scenes', project.scenes],
    ['audioTracks', project.audioTracks ?? []],
    ['subtitles', project.subtitles ?? []],
  ] as const;

  for (const [collection, entries] of collections) {
    entries.forEach((entry, index) => {
      const owner = owners.get(entry.id);
      if (owner) {
        let message = `ID "${entry.id}" is already used by ${owner}. IDs must be unique across the project.`;
        if (owner === collection) {
          if (owner === 'scenes') {
            message = `Duplicate scene ID "${entry.id}". Scene IDs must be unique.`;
          } else if (owner === 'audioTracks') {
            message = `Duplicate audio track ID "${entry.id}". Audio track IDs must be unique.`;
          } else {
            message = `Duplicate subtitle ID "${entry.id}". Subtitle IDs must be unique.`;
          }
        }
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [collection, index, 'id'],
          message,
        });
      } else {
        owners.set(entry.id, collection);
      }
    });
  }
});

/**
 * Migrates a raw project object from previous versions to the current schema.
 * Preserves all existing fields and fills in defaults safely.
 */
export function migrateProject(raw: unknown): VideoProject {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid project: root must be an object');
  }

  const rawObj = { ...(raw as Record<string, unknown>) };

  // Set default schemaVersion if missing
  if (typeof rawObj.schemaVersion !== 'number') {
    rawObj.schemaVersion = CURRENT_SCHEMA_VERSION;
  }

  // Ensure scenes array exists
  if (!Array.isArray(rawObj.scenes)) {
    rawObj.scenes = [];
  }

  return VideoProjectSchema.parse(rawObj) as VideoProject;
}

