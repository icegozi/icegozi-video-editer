import fs from 'node:fs';
import path from 'node:path';
import { spawn, ChildProcess } from 'node:child_process';
import { VideoProject } from '../../domain/video/VideoProject';
import { VideoProjectSchema, migrateProject } from '../../schemas/project.schema';
import { RenderProfile, RENDER_CONFIG } from '../../config/render.config';
import { PATHS } from '../../config/paths.config';
import { ensureDirectories } from '../../infrastructure/filesystem/ensureDirectories';
import { logger } from '../../infrastructure/logging/logger';
import { generateId } from '../../shared/utils/id';

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
  private jobs = new Map<string, RenderJob>();

  constructor() {
    ensureDirectories();
  }

  createJob(rawProject: unknown, profileName: RenderProfile = RenderProfile.Preview): RenderJob {
    ensureDirectories();

    // Validate project schema and make an immutable clone
    const project = migrateProject(rawProject);
    const validated = VideoProjectSchema.parse(project) as VideoProject;

    const jobId = generateId('job').slice(0, 16);
    const targetDir = profileName === RenderProfile.Preview ? PATHS.previews : PATHS.output;
    const sanitizedTitle = validated.title.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 30);
    const outputFilename = `${sanitizedTitle}_${profileName}_${jobId}.mp4`;
    const outputPath = path.resolve(targetDir, outputFilename);

    const job: RenderJob = {
      id: jobId,
      projectTitle: validated.title,
      profile: profileName,
      status: 'queued',
      progress: 0,
      outputPath,
      downloadUrl: `/api/render/download/${jobId}`,
      error: null,
      createdAt: Date.now(),
      completedAt: null,
    };

    this.jobs.set(jobId, job);

    // Save snapshot of current project for rendering
    const snapshotPath = path.resolve(PATHS.temp, `snapshot_${jobId}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify({ project: validated }, null, 2));

    // Start background render execution
    this.executeJob(job, snapshotPath);

    return job;
  }

  getJob(jobId: string): RenderJob | null {
    return this.jobs.get(jobId) ?? null;
  }

  listJobs(): RenderJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === 'queued' || job.status === 'rendering') {
      if (job.process && !job.process.killed) {
        try {
          job.process.kill('SIGTERM');
        } catch {
          // Ignore kill error
        }
      }
      job.status = 'cancelled';
      job.completedAt = Date.now();
      job.error = 'Render job cancelled by user';
      logger.info(`Render job ${jobId} cancelled by user`);

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

  private executeJob(job: RenderJob, snapshotPath: string): void {
    job.status = 'rendering';
    job.progress = 5;

    const profileSettings = RENDER_CONFIG[job.profile];
    const isWindows = process.platform === 'win32';
    const npxCmd = isWindows ? 'npx.cmd' : 'npx';

    const args = [
      'remotion',
      'render',
      'src/index.ts',
      'MainVideo',
      `"${job.outputPath!}"`,
      `"--props=${snapshotPath}"`,
      `--crf=${profileSettings.crf}`,
      `--jpeg-quality=${profileSettings.jpegQuality}`,
      `--scale=${job.profile === RenderProfile.Preview ? 0.5 : 1}`,
      '--gl=angle',
    ];

    logger.info(`Starting render job ${job.id}: ${npxCmd} ${args.join(' ')}`);

    const child = spawn(npxCmd, args, {
      cwd: PATHS.root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
      shell: isWindows,
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
        }
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      accumulatedStderr += data.toString();
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
          logger.info(`Render job ${job.id} completed successfully! Output: ${job.outputPath} (${stat.size} bytes)`);
          return;
        }
      }

      job.status = 'failed';
      job.completedAt = Date.now();
      job.error = accumulatedStderr.slice(-400) || `Remotion process exited with code ${code}`;
      logger.error(`Render job ${job.id} failed: ${job.error}`);
    });

    child.on('error', (err: Error) => {
      if (job.status !== 'cancelled') {
        job.status = 'failed';
        job.completedAt = Date.now();
        job.error = err.message;
        logger.error(`Render job ${job.id} spawn error: ${err.message}`);
      }
    });
  }
}

export const renderService = new RenderService();
