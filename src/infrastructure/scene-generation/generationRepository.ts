import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { AssistantError } from '../../application/assistant/errors';
import {
  RegisteredAssetSchema,
  isTerminalGenerationJob,
  type GenerationJob,
  type GenerationOwner,
  type GenerationPlan,
  type RegisteredAsset,
} from '../../application/scene-generation/generation.contracts';
import { GENERATION_LIMITS } from '../../application/scene-generation/catalog';
import type { SceneGenerationRepository } from '../../application/scene-generation/ports/sceneGenerationPorts';

type PayloadRow = { payload: string };
export class GenerationRepository implements SceneGenerationRepository {
  constructor(public readonly database: Database.Database) {}
  get workspaceKey(): string {
    return this.database.name;
  }
  plan(id: string): GenerationPlan | null {
    const row = this.database.prepare('SELECT payload FROM generation_plans WHERE id=?').get(id) as
      PayloadRow | undefined;
    return row ? (JSON.parse(row.payload) as GenerationPlan) : null;
  }
  plans(owner: GenerationOwner): GenerationPlan[] {
    return (
      this.database
        .prepare(
          'SELECT payload FROM generation_plans WHERE owner=? AND project_id=? ORDER BY created_at DESC LIMIT 40',
        )
        .all(owner.profileId, owner.projectId) as PayloadRow[]
    ).map((row) => JSON.parse(row.payload) as GenerationPlan);
  }
  savePlan(plan: GenerationPlan): void {
    this.database
      .prepare(
        'INSERT INTO generation_plans(id,owner,project_id,status,created_at,payload) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,payload=excluded.payload',
      )
      .run(
        plan.id,
        plan.profileId,
        plan.projectId,
        plan.status,
        plan.createdAt,
        JSON.stringify(plan),
      );
  }
  job(id: string): GenerationJob | null {
    const row = this.database.prepare('SELECT payload FROM generation_jobs WHERE id=?').get(id) as
      PayloadRow | undefined;
    return row ? (JSON.parse(row.payload) as GenerationJob) : null;
  }
  jobForPlan(id: string): GenerationJob | null {
    const row = this.database
      .prepare('SELECT payload FROM generation_jobs WHERE plan_id=?')
      .get(id) as PayloadRow | undefined;
    return row ? (JSON.parse(row.payload) as GenerationJob) : null;
  }
  duplicate(prepared: RegisteredAsset): RegisteredAsset | null {
    const row = this.database
      .prepare('SELECT id,storage_key FROM media_assets WHERE file_hash_sha256=?')
      .get(prepared.hash) as { id: string; storage_key: string } | undefined;
    return row ? { ...prepared, id: row.id, storageKey: row.storage_key } : null;
  }
  invalidatePending(): void {
    const rows = this.database
      .prepare("SELECT payload FROM generation_plans WHERE status IN ('draft','awaiting_approval')")
      .all() as PayloadRow[];
    for (const row of rows) {
      const plan = JSON.parse(row.payload) as GenerationPlan;
      this.savePlan({ ...plan, status: 'invalidated' });
    }
  }
  jobs(): GenerationJob[] {
    return (this.database.prepare('SELECT payload FROM generation_jobs').all() as PayloadRow[]).map(
      (row) => JSON.parse(row.payload) as GenerationJob,
    );
  }
  approve(plan: GenerationPlan): GenerationJob {
    return this.database.transaction(() => {
      const existing = this.jobForPlan(plan.id);
      if (existing) return existing;
      const stored = this.plan(plan.id);
      if (
        !stored ||
        stored.status !== 'awaiting_approval' ||
        stored.digest !== plan.digest ||
        stored.expiresAt < Date.now()
      )
        throw new AssistantError('approval_expired', 'Yêu cầu tạo cảnh đã thay đổi hoặc hết hạn.');
      const jobs = this.jobs().filter((job) => job.profileId === plan.profileId);
      if (jobs.filter((job) => !isTerminalGenerationJob(job)).length >= GENERATION_LIMITS.maxActiveJobs)
        throw new AssistantError(
          'generation_busy',
          'Đã có hai cảnh đang tạo. Chờ hoặc hủy tác vụ cũ.',
        );
      if (
        jobs.filter((job) => job.conversationId === plan.conversationId).length >=
        GENERATION_LIMITS.maxConversationJobs
      )
        throw new AssistantError('generation_limit', 'Đã đạt giới hạn tạo cảnh trong hội thoại.');
      if (plan.connection) {
        const now = Date.now();
        const dayStart = now - (now % 86400000);
        const reserved = jobs
          .filter((job) => job.createdAt >= dayStart && job.status !== 'cancelled')
          .reduce((sum, job) => sum + (this.plan(job.planId)?.estimate.costMicros ?? 0), 0);
        if (
          plan.estimate.costMicros > plan.connection.maxJobCostMicros ||
          reserved + plan.estimate.costMicros > plan.connection.dailyBudgetMicros
        )
          throw new AssistantError(
            'budget_exceeded',
            'Yêu cầu vượt giới hạn chi phí đã đặt trong app.',
          );
      }
      const now = Date.now();
      const job: GenerationJob = {
        id: randomUUID(),
        planId: plan.id,
        profileId: plan.profileId,
        projectId: plan.projectId,
        conversationId: plan.conversationId,
        epoch: plan.epoch,
        status: 'queued',
        version: 0,
        createdAt: now,
        updatedAt: now,
        nextPollAt: now,
        attempts: 0,
        cancellationRequested: false,
      };
      this.savePlan({ ...plan, status: 'approved' });
      this.database
        .prepare(
          'INSERT INTO generation_jobs(id,plan_id,owner,project_id,status,version,created_at,payload) VALUES(?,?,?,?,?,?,?,?)',
        )
        .run(
          job.id,
          job.planId,
          job.profileId,
          job.projectId,
          job.status,
          job.version,
          now,
          JSON.stringify(job),
        );
      this.event(job);
      return job;
    })();
  }
  update(job: GenerationJob, changes: Partial<GenerationJob>): GenerationJob {
    const next = {
      ...job,
      ...changes,
      version: job.version + 1,
      updatedAt: Date.now(),
    };
    const result = this.database
      .prepare('UPDATE generation_jobs SET status=?,version=?,payload=? WHERE id=? AND version=?')
      .run(next.status, next.version, JSON.stringify(next), job.id, job.version);
    if (!result.changes)
      throw new AssistantError('job_conflict', 'Trạng thái tác vụ đã thay đổi.', 409);
    if (job.status !== next.status) this.event(next);
    return next;
  }
  private event(job: GenerationJob): void {
    this.database
      .prepare('INSERT INTO generation_events(job_id,version,status,created_at) VALUES(?,?,?,?)')
      .run(job.id, job.version, job.status, Date.now());
    this.database
      .prepare('DELETE FROM generation_events WHERE job_id=? AND version < ?')
      .run(job.id, job.version - 64);
  }
  assets(owner: GenerationOwner): RegisteredAsset[] {
    const rows = [
      ...this.database
        .prepare(
          'SELECT payload FROM generation_asset_grants WHERE owner=? AND project_id=? LIMIT 500',
        )
        .all(owner.profileId, owner.projectId),
      ...this.database
        .prepare(
          'SELECT payload FROM imported_asset_grants WHERE owner=? AND project_id=? LIMIT 500',
        )
        .all(owner.profileId, owner.projectId),
    ] as PayloadRow[];
    const assets = new Map<string, RegisteredAsset>();
    for (const row of rows) {
      const asset = RegisteredAssetSchema.parse(JSON.parse(row.payload));
      if (!assets.has(asset.id)) assets.set(asset.id, asset);
    }
    return [...assets.values()];
  }
  private registerMedia(prepared: RegisteredAsset): RegisteredAsset {
    const now = Date.now();
    const existing = this.database
      .prepare('SELECT id,storage_key FROM media_assets WHERE file_hash_sha256=?')
      .get(prepared.hash) as { id: string; storage_key: string } | undefined;
    const asset = {
      ...prepared,
      ...(existing ? { id: existing.id, storageKey: existing.storage_key } : {}),
    };
    if (!existing)
      this.database
        .prepare(
          'INSERT INTO media_assets(id,original_filename,storage_key,mime_type,media_type,file_size_bytes,file_hash_sha256,metadata,is_normalized,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,0,?,?)',
        )
        .run(
          asset.id,
          `${asset.origin === 'generated' ? 'Generated' : 'Imported'} ${asset.mediaType}`,
          asset.storageKey,
          asset.mimeType,
          asset.mediaType,
          asset.fileSizeBytes,
          asset.hash,
          JSON.stringify(asset.metadata),
          now,
          now,
        );
    return asset;
  }
  importAsset(owner: GenerationOwner, prepared: RegisteredAsset): RegisteredAsset {
    return this.database.transaction(() => {
      const asset = this.registerMedia(prepared);
      this.database
        .prepare(
          'INSERT INTO project_assets(project_id,asset_id,linked_at) VALUES(?,?,?) ON CONFLICT(project_id,asset_id) DO NOTHING',
        )
        .run(owner.projectId, asset.id, Date.now());
      this.database
        .prepare(
          'INSERT INTO imported_asset_grants(owner,project_id,asset_id,payload) VALUES(?,?,?,?) ON CONFLICT(owner,project_id,asset_id) DO UPDATE SET payload=excluded.payload',
        )
        .run(owner.profileId, owner.projectId, asset.id, JSON.stringify(asset));
      return asset;
    })();
  }
  complete(job: GenerationJob, prepared: RegisteredAsset): RegisteredAsset {
    return this.database.transaction(() => {
      const now = Date.now();
      const asset = this.registerMedia(prepared);
      this.database
        .prepare(
          'INSERT INTO project_assets(project_id,asset_id,linked_at) VALUES(?,?,?) ON CONFLICT(project_id,asset_id) DO NOTHING',
        )
        .run(job.projectId, asset.id, now);
      this.database
        .prepare(
          'INSERT INTO generation_asset_grants(owner,project_id,asset_id,job_id,payload) VALUES(?,?,?,?,?) ON CONFLICT(owner,project_id,asset_id) DO UPDATE SET job_id=excluded.job_id,payload=excluded.payload',
        )
        .run(job.profileId, job.projectId, asset.id, job.id, JSON.stringify(asset));
      this.update(job, { status: 'ready', assetId: asset.id, progress: 100 });
      return asset;
    })();
  }
}
