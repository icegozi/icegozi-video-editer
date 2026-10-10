import { eq, desc, and } from 'drizzle-orm';
import { db } from './client';
import { projects, projectSnapshots } from './schema/projects';
import { VideoProject } from '../../domain/video/VideoProject';
import { generateId } from '../../shared/utils/id';
import { buildTimeline } from '../../application/timeline/buildTimeline';

export interface ProjectSummary {
  id: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
  currentRevision: number;
  lastEditedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface SaveProjectOptions {
  revision?: number;
  expectedRevision?: number;
  expectedServerRevision?: number;
  requestId?: string;
  changeSummary?: string;
}

function canonicalProjectPayload(project: {
  title: string;
  width: number;
  height: number;
  fps: number;
  schemaVersion?: number;
  metadata?: Record<string, unknown>;
  trackSettings?: Record<string, unknown>;
  scenes?: unknown[];
  audioTracks?: unknown[];
  subtitles?: unknown[];
}): string {
  return JSON.stringify({
    title: project.title,
    width: project.width,
    height: project.height,
    fps: project.fps,
    schemaVersion: project.schemaVersion ?? 1,
    metadata: project.metadata ?? {},
    trackSettings: project.trackSettings ?? {},
    scenes: project.scenes ?? [],
    audioTracks: project.audioTracks ?? [],
    subtitles: project.subtitles ?? [],
  });
}

export class ProjectDbService {
  /**
   * Saves or updates a project and appends a versioned timeline snapshot in a transaction.
   * Enforces Compare-And-Swap (CAS) with expectedServerRevision and ensures idempotent saves.
   */
  static saveProject(
    project: VideoProject,
    options: SaveProjectOptions = {}
  ): { revision: number; savedAt: number; idempotent?: boolean } {
    const now = Date.now();
    const existing = db
      .select()
      .from(projects)
      .where(eq(projects.id, project.id))
      .get();

    let targetRevision = 1;

    if (existing) {
      // Check latest snapshot for idempotency (identical content with repeated save)
      const latestSnapshot = db
        .select()
        .from(projectSnapshots)
        .where(eq(projectSnapshots.projectId, project.id))
        .orderBy(desc(projectSnapshots.revision))
        .limit(1)
        .get();

      if (latestSnapshot) {
        const candidatePayload = canonicalProjectPayload(project);
        const existingPayload = canonicalProjectPayload({
          title: existing.title,
          width: existing.width,
          height: existing.height,
          fps: existing.fps,
          schemaVersion: latestSnapshot.timelineData.schemaVersion,
          metadata: latestSnapshot.timelineData.projectMetadata,
          trackSettings: latestSnapshot.trackSettings as any,
          scenes: latestSnapshot.timelineData.scenes,
          audioTracks: latestSnapshot.timelineData.audioTracks,
          subtitles: latestSnapshot.timelineData.subtitles,
        });

        if (candidatePayload === existingPayload) {
          return { revision: existing.currentRevision, savedAt: existing.lastEditedAt, idempotent: true };
        }
      }

      const expectedRev = options.expectedServerRevision ?? options.expectedRevision ?? options.revision;
      if (expectedRev !== undefined && expectedRev < existing.currentRevision) {
        throw new Error(
          `Stale revision conflict: attempted to save revision ${expectedRev}, but server has revision ${existing.currentRevision}.`
        );
      }
      targetRevision = existing.currentRevision + 1;
    }

    const calculatedTimeline = buildTimeline(project);
    const durationFrames = calculatedTimeline.totalDurationInFrames;

    // Use transaction for atomic project update and snapshot creation
    db.transaction((tx) => {
      const slug = project.title
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .slice(0, 50) || 'project';

      if (existing) {
        tx.update(projects)
          .set({
            title: project.title,
            slug,
            width: project.width,
            height: project.height,
            fps: project.fps,
            durationFrames,
            currentRevision: targetRevision,
            lastEditedAt: now,
            updatedAt: now,
          })
          .where(eq(projects.id, project.id))
          .run();
      } else {
        tx.insert(projects)
          .values({
            id: project.id,
            title: project.title,
            slug,
            width: project.width,
            height: project.height,
            fps: project.fps,
            durationFrames,
            currentRevision: targetRevision,
            lastEditedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      tx.insert(projectSnapshots)
        .values({
          id: generateId('snap'),
          projectId: project.id,
          revision: targetRevision,
          changeSummary: options.changeSummary || `Revision ${targetRevision}`,
          timelineData: {
            schemaVersion: project.schemaVersion ?? 1,
            projectMetadata: project.metadata,
            scenes: project.scenes as any,
            audioTracks: (project.audioTracks || []) as any,
            subtitles: (project.subtitles || []) as any,
          },
          trackSettings: (project.trackSettings || {}) as any,
          createdAt: now,
        })
        .run();
    });

    return { revision: targetRevision, savedAt: now };
  }

  /**
   * Creates an immutable render snapshot without advancing the project's active edited revision counter.
   */
  static createRenderSnapshot(
    project: VideoProject,
    options: { changeSummary?: string } = {}
  ): { snapshotId: string; revision: number } {
    const now = Date.now();
    const existing = db
      .select()
      .from(projects)
      .where(eq(projects.id, project.id))
      .get();

    const revision = existing ? existing.currentRevision : 1;

    // Reuse existing snapshot for this revision if already present, to respect UNIQUE(project_id, revision)
    const existingSnapshot = db
      .select()
      .from(projectSnapshots)
      .where(
        and(
          eq(projectSnapshots.projectId, project.id),
          eq(projectSnapshots.revision, revision)
        )
      )
      .get();

    if (existingSnapshot) {
      return { snapshotId: existingSnapshot.id, revision };
    }

    const calculatedTimeline = buildTimeline(project);
    const durationFrames = calculatedTimeline.totalDurationInFrames;
    const snapshotId = generateId('snap');

    db.transaction((tx) => {
      if (!existing) {
        const slug = project.title
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '-')
          .slice(0, 50) || 'project';
        tx.insert(projects)
          .values({
            id: project.id,
            title: project.title,
            slug,
            width: project.width,
            height: project.height,
            fps: project.fps,
            durationFrames,
            currentRevision: 1,
            lastEditedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      tx.insert(projectSnapshots)
        .values({
          id: snapshotId,
          projectId: project.id,
          revision,
          changeSummary: options.changeSummary || `Render snapshot at revision ${revision}`,
          timelineData: {
            schemaVersion: project.schemaVersion ?? 1,
            projectMetadata: project.metadata,
            scenes: project.scenes as any,
            audioTracks: (project.audioTracks || []) as any,
            subtitles: (project.subtitles || []) as any,
          },
          trackSettings: (project.trackSettings || {}) as any,
          createdAt: now,
        })
        .run();
    });

    return { snapshotId, revision };
  }

  /**
   * Retrieves a project and reconstructs its full VideoProject model from the latest snapshot.
   */
  static getProject(projectId: string): VideoProject | null {
    const projectRecord = db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .get();

    if (!projectRecord) {
      return null;
    }

    const latestSnapshot = db
      .select()
      .from(projectSnapshots)
      .where(eq(projectSnapshots.projectId, projectId))
      .orderBy(desc(projectSnapshots.revision))
      .limit(1)
      .get();

    if (!latestSnapshot) {
      return null;
    }

    const timeline = latestSnapshot.timelineData;

    return {
      schemaVersion: timeline.schemaVersion ?? 1,
      id: projectRecord.id,
      title: projectRecord.title,
      width: projectRecord.width,
      height: projectRecord.height,
      fps: projectRecord.fps,
      scenes: (timeline.scenes || []) as any,
      audioTracks: (timeline.audioTracks || []) as any,
      subtitles: (timeline.subtitles || []) as any,
      trackSettings: (latestSnapshot.trackSettings || {}) as any,
      metadata: timeline.projectMetadata ?? {
        currentRevision: projectRecord.currentRevision,
        lastEditedAt: projectRecord.lastEditedAt,
      },
    };
  }

  /**
   * Lists all existing projects sorted by updated_at descending.
   */
  static listProjects(): ProjectSummary[] {
    const records = db
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt))
      .all();

    return records.map((r) => ({
      id: r.id,
      title: r.title,
      width: r.width,
      height: r.height,
      fps: r.fps,
      durationFrames: r.durationFrames,
      currentRevision: r.currentRevision,
      lastEditedAt: r.lastEditedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Deletes a project and cascades delete to its snapshots.
   */
  static deleteProject(projectId: string): boolean {
    const result = db.delete(projects).where(eq(projects.id, projectId)).run();
    return result.changes > 0;
  }
}
