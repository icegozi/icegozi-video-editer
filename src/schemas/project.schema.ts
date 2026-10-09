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
  // Validate scene IDs uniqueness
  const sceneIds = new Set<string>();
  project.scenes.forEach((scene, index) => {
    if (sceneIds.has(scene.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['scenes', index, 'id'],
        message: `Duplicate scene ID found: "${scene.id}". IDs must be unique across scenes.`,
      });
    }
    sceneIds.add(scene.id);
  });

  // Validate audio track IDs uniqueness
  if (project.audioTracks) {
    const audioIds = new Set<string>();
    project.audioTracks.forEach((track, index) => {
      if (audioIds.has(track.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['audioTracks', index, 'id'],
          message: `Duplicate audio track ID found: "${track.id}". IDs must be unique.`,
        });
      }
      audioIds.add(track.id);
    });
  }

  // Validate subtitle IDs uniqueness
  if (project.subtitles) {
    const subtitleIds = new Set<string>();
    project.subtitles.forEach((cue, index) => {
      if (subtitleIds.has(cue.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['subtitles', index, 'id'],
          message: `Duplicate subtitle ID found: "${cue.id}". IDs must be unique.`,
        });
      }
      subtitleIds.add(cue.id);
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

