import { eq, desc } from 'drizzle-orm';
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

export class ProjectDbService {
  /**
   * Saves or updates a project and appends a versioned timeline snapshot in a transaction.
   */
  static saveProject(
    project: VideoProject,
    options: { revision?: number; changeSummary?: string } = {}
  ): { revision: number; savedAt: number } {
    const now = Date.now();
    const existing = db
      .select()
      .from(projects)
      .where(eq(projects.id, project.id))
      .get();

    let targetRevision = 1;

    if (existing) {
      if (options.revision !== undefined && options.revision < existing.currentRevision) {
        throw new Error(
          `Stale revision conflict: attempted to save revision ${options.revision}, but server has revision ${existing.currentRevision}.`
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
      id: projectRecord.id,
      title: projectRecord.title,
      width: projectRecord.width,
      height: projectRecord.height,
      fps: projectRecord.fps,
      scenes: (timeline.scenes || []) as any,
      audioTracks: (timeline.audioTracks || []) as any,
      subtitles: (timeline.subtitles || []) as any,
      trackSettings: (latestSnapshot.trackSettings || {}) as any,
      metadata: {
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
