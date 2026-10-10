import fs from 'node:fs';
import path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import { createRequire } from 'node:module';
import { eq, desc } from 'drizzle-orm';
import { VideoProject } from '../../domain/video/VideoProject';
import { VideoProjectSchema, migrateProject } from '../../schemas/project.schema';
import { RenderProfile, RENDER_CONFIG } from '../../config/render.config';
import { PATHS } from '../../config/paths.config';
import { ensureDirectories } from '../../infrastructure/filesystem/ensureDirectories';
import { logger } from '../../infrastructure/logging/logger';
import { generateId } from '../../shared/utils/id';
import { db } from '../../infrastructure/db/client';
import { renderJobs } from '../../infrastructure/db/schema/renderJobs';
import { projectSnapshots, projects } from '../../infrastructure/db/schema/projects';
import { ProjectDbService } from '../../infrastructure/db/projectDbService';

export type RenderJobStatus = 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled';

export interface RenderJob {
  id: string;
  projectTitle: string;
  profile: RenderProfile;
  status: RenderJobStatus;
  progress: number; // 0 to 100
  outputPath: string | null;
  downloadUrl: string | null;
  error: string | null;
  createdAt: number;
  completedAt: number | null;
  process?: ChildProcess;
}

class RenderService {
  private activeJobs = new Map<string, RenderJob>();

  constructor() {
    ensureDirectories();
  }

  createJob(rawProject: unknown, profileName: RenderProfile = RenderProfile.Preview): RenderJob {
    if (profileName !== RenderProfile.Preview && profileName !== RenderProfile.Final) {
      throw new Error(`Invalid render profile "${String(profileName)}". Expected preview or final.`);
    }

    ensureDirectories();

    // Validate project schema and make an immutable clone
    const project = migrateProject(rawProject);
    const validated = VideoProjectSchema.parse(project) as VideoProject;

    // Create immutable render snapshot without bumping active edited revision
    const { snapshotId } = ProjectDbService.createRenderSnapshot(validated, {
      changeSummary: `Render ${profileName} snapshot`,
    });

    const jobId = generateId('job').slice(0, 16);
    const targetDir = profileName === RenderProfile.Preview ? PATHS.previews : PATHS.output;
    const sanitizedTitle = validated.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 30);
    const outputFilename = `${sanitizedTitle}_${profileName}_${jobId}.mp4`;
    const outputPath = path.resolve(targetDir, outputFilename);
    const now = Date.now();

    const job: RenderJob = {
      id: jobId,
      projectTitle: validated.title,
      profile: profileName,
      status: 'queued',
      progress: 0,
      outputPath,
      downloadUrl: `/api/render/download/${jobId}`,
      error: null,
      createdAt: now,
      completedAt: null,
    };

    // Save initial job record in SQLite
    db.insert(renderJobs)
      .values({
        id: jobId,
        projectId: validated.id,
        snapshotId,
        profile: profileName,
        status: 'queued',
        progress: 0,
        outputStorageKey: outputPath,
        downloadUrl: job.downloadUrl,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    this.activeJobs.set(jobId, job);

    const snapshotPath = path.resolve(PATHS.temp, `snapshot_${jobId}.json`);
    try {
      // Save snapshot of current project for rendering
      fs.writeFileSync(snapshotPath, JSON.stringify({ project: validated }, null, 2));

      // Start background render execution
      this.executeJob(job, snapshotPath);
    } catch (err) {
      job.status = 'failed';
      job.completedAt = Date.now();
      job.error = err instanceof Error ? err.message : String(err);
      this.updateDbJob(jobId, {
        status: 'failed',
        completedAt: job.completedAt,
        errorMessage: job.error,
      });
      if (fs.existsSync(snapshotPath)) {
        try { fs.unlinkSync(snapshotPath); } catch {}
      }
      throw err;
    }

    return job;
  }

  getJob(jobId: string): RenderJob | null {
    const active = this.activeJobs.get(jobId);
    if (active) return active;

    // Fallback to SQLite database if not in active memory
    const record = db
      .select({
        job: renderJobs,
        project: projects,
      })
      .from(renderJobs)
      .leftJoin(projects, eq(renderJobs.projectId, projects.id))
      .where(eq(renderJobs.id, jobId))
      .get();

    if (!record) return null;

    return {
      id: record.job.id,
      projectTitle: record.project?.title || 'Video Project',
      profile: record.job.profile as RenderProfile,
      status: record.job.status as RenderJobStatus,
      progress: record.job.progress,
      outputPath: record.job.outputStorageKey,
      downloadUrl: record.job.downloadUrl,
      error: record.job.errorMessage,
      createdAt: record.job.createdAt,
      completedAt: record.job.completedAt,
    };
  }

  listJobs(): RenderJob[] {
    const records = db
      .select({
        job: renderJobs,
        project: projects,
      })
      .from(renderJobs)
      .leftJoin(projects, eq(renderJobs.projectId, projects.id))
      .orderBy(desc(renderJobs.createdAt))
      .all();

    return records.map((r) => {
      const active = this.activeJobs.get(r.job.id);
      if (active) return active;

      return {
        id: r.job.id,
        projectTitle: r.project?.title || 'Video Project',
        profile: r.job.profile as RenderProfile,
        status: r.job.status as RenderJobStatus,
        progress: r.job.progress,
        outputPath: r.job.outputStorageKey,
        downloadUrl: r.job.downloadUrl,
        error: r.job.errorMessage,
        createdAt: r.job.createdAt,
        completedAt: r.job.completedAt,
      };
    });
  }

  cancelJob(jobId: string): boolean {
    const job = this.getJob(jobId);
    if (!job) return false;

    if (job.status === 'queued' || job.status === 'rendering') {
      const active = this.activeJobs.get(jobId);
      if (active?.process && !active.process.killed) {
        try {
          active.process.kill('SIGTERM');
        } catch {
          // Ignore kill error
        }
      }
      job.status = 'cancelled';
      job.completedAt = Date.now();
      job.error = 'Render job cancelled by user';
      logger.info(`Render job ${jobId} cancelled by user`);

      this.updateDbJob(jobId, {
        status: 'cancelled',
        completedAt: job.completedAt,
        errorMessage: job.error,
      });

      // Clean up partial output if exists
      if (job.outputPath && fs.existsSync(job.outputPath)) {
        try {
          fs.unlinkSync(job.outputPath);
        } catch {
          // Ignore cleanup error
        }
      }

      return true;
    }

    return false;
  }

  private updateDbJob(
    jobId: string,
    updates: Partial<{
      status: string;
      progress: number;
      completedAt: number | null;
      errorMessage: string | null;
    }>
  ): void {
    try {
      db.update(renderJobs)
        .set({
          ...updates,
          updatedAt: Date.now(),
        })
        .where(eq(renderJobs.id, jobId))
        .run();
    } catch (e) {
      logger.warn(`Failed to update SQLite render_jobs record for ${jobId}: ${e}`);
    }
  }

  private executeJob(job: RenderJob, snapshotPath: string): void {
    job.status = 'rendering';
    job.progress = 5;
    this.updateDbJob(job.id, { status: 'rendering', progress: 5 });

    const profileSettings = RENDER_CONFIG[job.profile];
    const require = createRequire(import.meta.url);
    const cli = path.join(path.dirname(require.resolve('@remotion/cli/package.json')), 'remotion-cli.js');

    const args = [
      cli,
      'render',
      'src/index.ts',
      'MainVideo',
      job.outputPath!,
      `--props=${snapshotPath}`,
      `--crf=${profileSettings.crf}`,
      `--jpeg-quality=${profileSettings.jpegQuality}`,
      `--codec=${profileSettings.codec}`,
      `--pixel-format=${profileSettings.pixelFormat}`,
      `--scale=${job.profile === RenderProfile.Preview ? 0.5 : 1}`,
      `--public-dir=${path.dirname(PATHS.publicAssets)}`,
      ...(process.env.ICEGOZI_BROWSER_EXECUTABLE ? [`--browser-executable=${process.env.ICEGOZI_BROWSER_EXECUTABLE}`] : []),
      '--gl=angle',
    ];

    logger.info(`Starting render job ${job.id}`);

    const child = spawn(process.execPath, args, {
      cwd: PATHS.root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, TEMP: process.env.TEMP, TMP: process.env.TMP,
        HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE, LOCALAPPDATA: process.env.LOCALAPPDATA },
      shell: false,
      windowsHide: true,
    });

    job.process = child;
    let accumulatedStderr = '';

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();

      // Parse percentage progress from Remotion stdout (e.g., "Rendering: 45%" or "Frame 45/100")
      const percentMatch = text.match(/(\d+)%/);
      if (percentMatch) {
        const pct = parseInt(percentMatch[1], 10);
        if (pct >= 5 && pct <= 98) {
          job.progress = pct;
          this.updateDbJob(job.id, { progress: pct });
        }
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      accumulatedStderr = (accumulatedStderr + data.toString()).slice(-8000);
    });

    child.on('close', (code: number | null) => {
      // Clean up snapshot temp file
      if (fs.existsSync(snapshotPath)) {
        try {
          fs.unlinkSync(snapshotPath);
        } catch {
          // Ignore
        }
      }

      if (job.status === 'cancelled') {
        return;
      }

      if (code === 0 && job.outputPath && fs.existsSync(job.outputPath)) {
        const stat = fs.statSync(job.outputPath);
        if (stat.size > 1000) {
          job.status = 'completed';
          job.progress = 100;
          job.completedAt = Date.now();
          this.updateDbJob(job.id, {
            status: 'completed',
            progress: 100,
            completedAt: job.completedAt,
          });
          logger.info(`Render job ${job.id} completed successfully! Output: ${job.outputPath} (${stat.size} bytes)`);
          return;
        }
      }

      job.status = 'failed';
      job.completedAt = Date.now();
      job.error = accumulatedStderr.slice(-400) || `Remotion process exited with code ${code}`;
      this.updateDbJob(job.id, {
        status: 'failed',
        completedAt: job.completedAt,
        errorMessage: job.error,
      });
      logger.error(`Render job ${job.id} failed: ${job.error}`);
    });

    child.on('error', (err: Error) => {
      if (job.status !== 'cancelled') {
        job.status = 'failed';
        job.completedAt = Date.now();
        job.error = err.message;
        this.updateDbJob(job.id, {
          status: 'failed',
          completedAt: job.completedAt,
          errorMessage: job.error,
        });
        logger.error(`Render job ${job.id} spawn error: ${err.message}`);
      }
    });
  }
}

export const renderService = new RenderService();
