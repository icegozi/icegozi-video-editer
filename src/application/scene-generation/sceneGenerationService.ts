import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { SceneGenerationProvider } from './SceneGenerationProvider';
import { coreTemplate, CORE_TEMPLATES } from './coreTemplates';
import { CoreSceneSchema } from './coreScene.schema';
import {
  GenerationRequestSchema,
  type GenerationOwner,
  type GenerationPlan,
  type GenerationJob,
  type GenerationStatus,
  type RegisteredAsset,
  type GenerationOverview,
  type GenerationCapabilities,
  type GoogleConnection,
  isTerminalGenerationJob,
} from './generation.contracts';
import type { ProjectSnapshot } from '../assistant/assistant.contracts';
import { projectFingerprint } from '../assistant/projectProposals';
import { AssistantError } from '../assistant/errors';
import { containedPath } from './containedPath';
import type {
  GeneratedAssetStore,
  SceneGenerationRepository,
} from './ports/sceneGenerationPorts';
import {
  GENERATION_LIMITS,
  GENERATION_PRESETS,
  GENERATION_PRICING,
} from './catalog';
import { getSceneTrackId } from '../../domain/video/trackUtils';
import { Transform, type Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { lockSync } from 'proper-lockfile';

export class SceneGenerationService {
  private active = new Map<string, AbortController>();
  private stopped = false;
  private listeners = new Set<() => void>();
  private imports = 0;
  private releaseWorkspace?: () => void;
  constructor(
    private repository: SceneGenerationRepository,
    private ingest: GeneratedAssetStore,
    private providers: SceneGenerationProvider[],
    public readonly google: GoogleConnection,
    private tempRoot: string,
    private ensureOwner: (owner: GenerationOwner) => Promise<void>,
    private ensureProject: (snapshot: ProjectSnapshot) => void,
  ) {
    fs.mkdirSync(tempRoot, { recursive: true });
  }
  private start(): void {
    if (this.stopped) throw new AssistantError('generation_closed', 'Core tạo cảnh đã đóng.');
    if (this.releaseWorkspace) return;
    const target =
      this.repository.workspaceKey === ':memory:' ? this.tempRoot : this.repository.workspaceKey;
    try {
      this.releaseWorkspace = lockSync(target, {
        realpath: true,
        stale: 60000,
        update: 15000,
      });
    } catch {
      throw new AssistantError(
        'workspace_busy',
        'Workspace đang được một bản ICEGOZI khác sử dụng. Đóng bản đó trước khi tạo cảnh.',
        409,
      );
    }
    // Recovery is deferred until the backend actually serves a generation request.
    try {
      for (const job of this.repository.jobs())
        if (!isTerminalGenerationJob(job)) {
          const plan = this.repository.plan(job.planId);
          this.repository.update(job, {
            status:
              plan?.preset.providerId === 'gemini' && job.status !== 'queued'
                ? 'submission_unknown'
                : 'interrupted',
            error: {
              code: 'server_restarted',
              message: 'App đã khởi động lại. Tác vụ không tự chạy lại.',
              retryable: false,
            },
          });
        }
    } catch (error) {
      this.releaseWorkspace();
      this.releaseWorkspace = undefined;
      throw error;
    }
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit() {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch {
        this.listeners.delete(listener);
      }
    }
  }
  async capabilities(owner: GenerationOwner): Promise<GenerationCapabilities> {
    await this.ensureOwner(owner);
    this.start();
    const status = await this.google.status(owner.profileId).catch(() => null);
    await this.ensureOwner(owner);
    return {
      supported: true,
      available: true,
      connection: status?.connection ?? null,
      reason: status?.connection
        ? undefined
        : 'Core chạy local. Cấu hình Gemini API key hoặc Google OAuth để tạo ảnh.',
      presets: GENERATION_PRESETS,
      pricing: GENERATION_PRICING,
      limits: GENERATION_LIMITS,
    };
  }
  templates() {
    return {
      templates: CORE_TEMPLATES,
      sceneSchema: CoreSceneSchema.toJSONSchema(),
    };
  }
  async assets(owner: GenerationOwner): Promise<RegisteredAsset[]> {
    await this.ensureOwner(owner);
    this.start();
    return this.repository.assets(owner).filter((asset) => {
      try {
        this.ingest.file(asset);
        return true;
      } catch {
        return false;
      }
    });
  }
  async assetPolicy(owner: GenerationOwner, keys?: Iterable<string>) {
    const selection = keys ? new Set(keys) : null;
    const assets = (await this.assets(owner)).filter(
      (asset) => !selection || selection.has(asset.storageKey),
    );
    for (const asset of assets) await this.ingest.verify(asset);
    await this.ensureOwner(owner);
    return {
      allowedNewAssetKeys: new Set(assets.map((asset) => asset.storageKey)),
      mediaMetadata: new Map(assets.map((asset) => [asset.storageKey, asset.metadata])),
    };
  }
  async resultFile(owner: GenerationOwner, assetId: string) {
    const asset = (await this.assets(owner)).find((entry) => entry.id === assetId);
    if (!asset)
      throw new AssistantError('asset_owner', 'Media không thuộc dự án và tài khoản này.', 403);
    await this.ingest.verify(asset);
    await this.ensureOwner(owner);
    return { file: this.ingest.file(asset), asset };
  }
  async importImage(
    owner: GenerationOwner,
    snapshot: ProjectSnapshot,
    input: Readable,
    mimeType: string,
  ): Promise<RegisteredAsset> {
    await this.ensureOwner(owner);
    this.start();
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType))
      throw new AssistantError('image_type', 'Nhập ảnh PNG, JPEG hoặc WebP.');
    if (this.imports >= 2 || this.repository.assets(owner).length >= 500)
      throw new AssistantError(
        'asset_limit',
        'Chờ nhập ảnh hoàn tất hoặc giảm số media trong thư viện.',
      );
    this.imports++;
    const id = randomUUID();
    const directory = path.join(this.tempRoot, `import-${id}`);
    const file = path.join(directory, 'image.tmp');
    let size = 0;
    try {
      fs.mkdirSync(directory);
      containedPath(this.tempRoot, directory);
      const limit = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          size += chunk.byteLength;
          if (size > GENERATION_LIMITS.maxReferenceBytes)
            callback(new AssistantError('image_large', 'Ảnh tham chiếu phải nhỏ hơn 3 MiB.', 413));
          else callback(null, chunk);
        },
      });
      await pipeline(input, limit, fs.createWriteStream(file, { flags: 'wx' }));
      await this.ensureOwner(owner);
      this.ensureProject(snapshot);
      const prepared = await this.ingest.prepare(
        file,
        'image',
        mimeType,
        id,
        AbortSignal.timeout(90000),
      );
      const { jobId: _jobId, ...value } = prepared;
      const candidate = { ...value, origin: 'imported' as const };
      const duplicate = this.repository.duplicate(candidate);
      if (duplicate) await this.ingest.verify(duplicate);
      await this.ensureOwner(owner);
      const asset = this.repository.importAsset(owner, candidate);
      if (asset.storageKey !== candidate.storageKey) this.ingest.discardUnregistered(candidate);
      this.emit();
      return asset;
    } finally {
      this.imports--;
      if (fs.existsSync(file)) fs.unlinkSync(file);
      if (fs.existsSync(directory) && fs.readdirSync(directory).length === 0)
        fs.rmdirSync(directory);
    }
  }
  async plan(
    owner: GenerationOwner,
    snapshot: ProjectSnapshot,
    raw: unknown,
  ): Promise<GenerationPlan> {
    await this.ensureOwner(owner);
    this.start();
    const request = GenerationRequestSchema.parse(raw);
    const preset = GENERATION_PRESETS.find((entry) => entry.id === request.presetId);
    if (!preset || preset.kind !== request.kind || request.prompt.length > preset.maxPromptLength)
      throw new AssistantError(
        'unsupported_request',
        'Preset hoặc nội dung tạo cảnh không hợp lệ.',
      );
    if (
      request.kind === 'video'
        ? !request.durationSeconds || !preset.durations.includes(request.durationSeconds)
        : request.durationSeconds !== undefined
    ) {
      throw new AssistantError(
        'unsupported_request',
        'Chọn thời lượng được preset hỗ trợ. Ảnh không nhận thời lượng tạo video.',
      );
    }
    if (request.intent.placement === 'replace') {
      const scene = snapshot.project.scenes.find(
        (entry) => entry.id === request.intent.replaceSceneId,
      );
      if (
        !scene ||
        snapshot.project.trackSettings?.[getSceneTrackId(scene, snapshot.project.scenes)]?.locked
      )
        throw new AssistantError('scene_locked', 'Cảnh cần thay không tồn tại hoặc đang khóa.');
    } else if (request.intent.replaceSceneId)
      throw new AssistantError('unsupported_request', 'Chỉ định cảnh thay thế khi chọn thay cảnh.');
    if (preset.providerId === 'core') {
      if (request.referenceAssetIds.length)
        throw new AssistantError(
          'unsupported_request',
          'Core này dựng hình/chữ từ dữ liệu cảnh, không tạo động tác từ ảnh.',
        );
      if (request.sceneSpec && request.templateId)
        throw new AssistantError(
          'unsupported_request',
          'Chọn mẫu hoặc dữ liệu cảnh, không chọn cả hai.',
        );
      if (request.templateId)
        request.sceneSpec = coreTemplate(
          request.templateId,
          preset.width,
          preset.height,
          request.durationSeconds ?? 5,
          request.title,
        );
      if (!request.sceneSpec)
        throw new AssistantError('scene_spec_missing', 'Core cần dữ liệu cảnh hoặc mẫu dựng cảnh.');
    } else if (request.sceneSpec || request.templateId)
      throw new AssistantError(
        'unsupported_request',
        'Gemini nhận mô tả ảnh và ảnh tham chiếu, không nhận scene graph.',
      );
    const assets = await this.assets(owner);
    const references = request.referenceAssetIds.map((id) => {
      const asset = assets.find((entry) => entry.id === id);
      if (
        !preset.supportsReference ||
        !asset ||
        asset.mediaType !== 'image' ||
        asset.fileSizeBytes > GENERATION_LIMITS.maxReferenceBytes
      )
        throw new AssistantError(
          'reference_invalid',
          'Ảnh tham chiếu phải thuộc thư viện dự án và nhỏ hơn 3 MiB.',
        );
      return asset;
    });
    for (const asset of references) await this.ingest.verify(asset);
    const connection =
      preset.providerId === 'gemini'
        ? (await this.google.status(owner.profileId)).connection
        : null;
    if (preset.providerId === 'gemini' && !connection)
      throw new AssistantError(
        'provider_not_configured',
        'Cấu hình Gemini API key hoặc kết nối Google OAuth để tạo ảnh.',
      );
    if (preset.providerId === 'gemini' && Date.now() >= GENERATION_PRICING.expiresAt)
      throw new AssistantError(
        'pricing_expired',
        'Bảng giá Gemini cần được cập nhật trước khi tạo ảnh.',
      );
    await this.ensureOwner(owner);
    if (
      this.repository
        .plans(owner)
        .filter(
          (entry) =>
            ['draft', 'awaiting_approval'].includes(entry.status) && entry.expiresAt > Date.now(),
        ).length >= 4
    )
      throw new AssistantError('plan_limit', 'Duyệt hoặc bỏ yêu cầu tạo cảnh cũ trước.');
    this.ensureProject(snapshot);
    const now = Date.now();
    // Reserve against the highest output-token rate and bounded input/reference sizes.
    const costMicros =
      preset.providerId === 'gemini'
        ? Math.ceil(
            (Buffer.byteLength(request.prompt) + references.length * 12000) * 0.25 + 4096 * 30,
          )
        : 0;
    const estimate = {
      costMicros,
      currency: 'USD' as const,
      pricingVersion: preset.providerId === 'core' ? 'local-core-v1' : GENERATION_PRICING.version,
      source: preset.providerId === 'core' ? 'ICEGOZI local core' : GENERATION_PRICING.source,
      verifiedAt: GENERATION_PRICING.verifiedAt,
      expiresAt: preset.providerId === 'core' ? now + 10 * 60_000 : GENERATION_PRICING.expiresAt,
      isEstimate: true as const,
    };
    const referenceHashes = references.map((asset) => asset.hash);
    const digest = createHash('sha256')
      .update(
        JSON.stringify({
          request,
          preset,
          referenceHashes,
          connectionVersion: connection?.version,
          estimate,
        }),
      )
      .digest('hex');
    const plan: GenerationPlan = {
      ...owner,
      id: randomUUID(),
      request,
      digest,
      connection,
      preset,
      referenceHashes,
      estimate,
      fps: Math.min(60, snapshot.project.fps),
      baseRevision: snapshot.revision,
      fingerprint: projectFingerprint(snapshot.project),
      status: 'draft',
      createdAt: now,
      expiresAt: now + 10 * 60_000,
    };
    this.repository.savePlan(plan);
    this.emit();
    return plan;
  }
  private ownedPlan(owner: GenerationOwner, id: string): GenerationPlan {
    this.start();
    const plan = this.repository.plan(id);
    if (!plan || plan.profileId !== owner.profileId || plan.projectId !== owner.projectId)
      throw new AssistantError(
        'generation_owner',
        'Yêu cầu không thuộc dự án và tài khoản này.',
        403,
      );
    return plan;
  }
  async request(owner: GenerationOwner, planId: string) {
    await this.ensureOwner(owner);
    const plan = this.ownedPlan(owner, planId);
    if (
      plan.epoch !== owner.epoch ||
      plan.conversationId !== owner.conversationId ||
      plan.expiresAt < Date.now() ||
      !['draft', 'awaiting_approval', 'approved'].includes(plan.status)
    )
      throw new AssistantError(
        'approval_expired',
        'Yêu cầu tạo cảnh đã hết hạn hoặc phiên đã đổi.',
      );
    if (plan.status === 'draft') this.repository.savePlan({ ...plan, status: 'awaiting_approval' });
    this.emit();
    return {
      requestId: plan.id,
      status: this.repository.plan(plan.id)!.status,
    };
  }
  async approve(
    owner: GenerationOwner,
    planId: string,
    accept: boolean,
  ): Promise<GenerationStatus> {
    await this.ensureOwner(owner);
    const plan = this.ownedPlan(owner, planId);
    const existing = this.repository.jobForPlan(planId);
    if (existing) return this.status(owner, planId);
    if (
      plan.epoch !== owner.epoch ||
      plan.conversationId !== owner.conversationId ||
      plan.expiresAt < Date.now()
    )
      throw new AssistantError('approval_expired', 'Yêu cầu đã hết hạn hoặc phiên đã đổi.');
    if (!accept) {
      this.repository.savePlan({ ...plan, status: 'declined' });
      this.emit();
      return this.status(owner, planId);
    }
    if (
      plan.connection &&
      (await this.google.status(owner.profileId)).connection?.version !== plan.connection.version
    )
      throw new AssistantError('owner_changed', 'Kết nối Google đã thay đổi; lập yêu cầu mới.');
    for (let i = 0; i < plan.request.referenceAssetIds.length; i++) {
      const asset = (await this.assets(owner)).find(
        (entry) => entry.id === plan.request.referenceAssetIds[i],
      );
      if (!asset || asset.hash !== plan.referenceHashes[i])
        throw new AssistantError('reference_changed', 'Ảnh tham chiếu đã thay đổi.');
      await this.ingest.verify(asset);
    }
    await this.ensureOwner(owner);
    const job = this.repository.approve(plan);
    this.emit();
    void this.execute(job, plan);
    return this.status(owner, planId);
  }
  async status(owner: GenerationOwner, requestId: string): Promise<GenerationStatus> {
    await this.ensureOwner(owner);
    const plan = this.ownedPlan(owner, requestId);
    const job = this.repository.jobForPlan(plan.id);
    return {
      requestId,
      plan,
      ...(job ? { job } : {}),
      ...(job?.assetId
        ? {
            asset: this.repository.assets(owner).find((entry) => entry.id === job.assetId),
          }
        : {}),
    };
  }
  async overview(owner: GenerationOwner): Promise<GenerationOverview> {
    const capabilities = await this.capabilities(owner);
    const assets = await this.assets(owner);
    const requests = this.repository
      .plans(owner)
      .filter((plan) => plan.status !== 'draft')
      .map((plan) => {
        const job = this.repository.jobForPlan(plan.id);
        return {
          requestId: plan.id,
          plan,
          ...(job ? { job } : {}),
          asset: assets.find((entry) => entry.id === job?.assetId),
        };
      });
    return { capabilities, requests, assets };
  }
  async cancel(owner: GenerationOwner, requestId: string): Promise<void> {
    await this.ensureOwner(owner);
    const plan = this.ownedPlan(owner, requestId);
    const job = this.repository.jobForPlan(plan.id);
    if (!job) {
      if (plan.status !== 'approved') this.repository.savePlan({ ...plan, status: 'declined' });
    } else if (!isTerminalGenerationJob(job)) {
      this.repository.update(job, {
        cancellationRequested: true,
        status: 'cancel_requested',
      });
      this.active.get(job.id)?.abort();
    }
    this.emit();
  }
  async retryLocal(owner: GenerationOwner, requestId: string): Promise<void> {
    await this.ensureOwner(owner);
    const plan = this.ownedPlan(owner, requestId);
    const job = this.repository.jobForPlan(requestId);
    if (
      !job ||
      plan.preset.providerId !== 'core' ||
      !['interrupted', 'failed'].includes(job.status)
    )
      throw new AssistantError(
        'retry_forbidden',
        'Lập yêu cầu mới để tạo lại ảnh Gemini; không tự gửi lại yêu cầu có thể đã tính phí.',
      );
    const next = this.repository.update(job, {
      status: 'queued',
      cancellationRequested: false,
      error: undefined,
      conversationId: owner.conversationId,
      epoch: owner.epoch,
    });
    void this.execute(next, plan);
  }
  private async execute(initial: GenerationJob, plan: GenerationPlan): Promise<void> {
    if (this.active.has(initial.id) || this.stopped) return;
    const controller = new AbortController();
    this.active.set(initial.id, controller);
    const jobDirectory = path.join(this.tempRoot, initial.id);
    const directory = path.join(jobDirectory, `attempt-${randomUUID()}`);
    let prepared: RegisteredAsset | undefined;
    let generationCompleted = false;
    try {
      await this.ensureOwner(initial);
      controller.signal.throwIfAborted();
      if (this.stopped) return;
      fs.mkdirSync(jobDirectory, { recursive: true });
      containedPath(this.tempRoot, jobDirectory);
      fs.mkdirSync(directory);
      containedPath(this.tempRoot, directory);
      const output = path.join(
        directory,
        plan.request.kind === 'video' ? 'result.mp4' : 'result.png',
      );
      if (fs.existsSync(output)) fs.unlinkSync(output);
      fs.writeFileSync(
        path.join(directory, 'job.json'),
        JSON.stringify({ jobId: initial.id, planId: plan.id }),
        { flag: 'w' },
      );
      const provider = this.providers.find((entry) => entry.id === plan.preset.providerId);
      if (!provider)
        throw new AssistantError('provider_missing', 'Core tạo cảnh chưa được cài đầy đủ.');
      let job = this.repository.job(initial.id)!;
      if (job.cancellationRequested || controller.signal.aborted)
        throw new AssistantError('cancelled', 'Đã dừng tạo cảnh.');
      job = this.repository.update(job, {
        status: 'submitting',
        attempts: job.attempts + 1,
      });
      this.emit();
      const asset = plan.request.referenceAssetIds.length
        ? this.repository
            .assets(initial)
            .find((entry) => entry.id === plan.request.referenceAssetIds[0])
        : undefined;
      const reference = asset
        ? {
            mimeType: asset.mimeType,
            data: fs.readFileSync(this.ingest.file(asset)),
          }
        : undefined;
      const result = await provider.generate(
        plan,
        output,
        reference,
        AbortSignal.any([controller.signal, AbortSignal.timeout(10 * 60_000)]),
        (percent) => {
          if (this.stopped) return;
          const current = this.repository.job(initial.id);
          if (current && !current.cancellationRequested && !isTerminalGenerationJob(current)) {
            this.repository.update(current, {
              status: 'processing',
              progress: percent,
            });
            this.emit();
          }
        },
      );
      generationCompleted = true;
      controller.signal.throwIfAborted();
      await this.ensureOwner(initial);
      job = this.repository.update(this.repository.job(initial.id)!, {
        status: 'validating',
      });
      this.emit();
      prepared = await this.ingest.prepare(
        output,
        plan.request.kind,
        result.mimeType,
        initial.id,
        controller.signal,
      );
      fs.writeFileSync(
        path.join(directory, 'job.json'),
        JSON.stringify({
          jobId: initial.id,
          planId: plan.id,
          storageKey: prepared.storageKey,
        }),
      );
      controller.signal.throwIfAborted();
      await this.ensureOwner(initial);
      const duplicate = this.repository.duplicate(prepared);
      if (duplicate) await this.ingest.verify(duplicate);
      controller.signal.throwIfAborted();
      const registered = this.repository.complete(this.repository.job(initial.id)!, prepared);
      if (registered.storageKey !== prepared.storageKey) this.ingest.discardUnregistered(prepared);
      this.emit();
    } catch (error) {
      if (this.stopped) return;
      const job = this.repository.job(initial.id);
      if (job && !isTerminalGenerationJob(job)) {
        const cancelled = controller.signal.aborted || job.cancellationRequested;
        const ambiguous =
          !generationCompleted &&
          plan.preset.providerId === 'gemini' &&
          job.attempts > 0 &&
          !(
            error instanceof AssistantError &&
            [
              'credential_expired',
              'quota_exceeded',
              'model_unavailable',
              'unsupported_request',
              'moderation_rejected',
              'google_token_failed',
            ].includes(error.code)
          );
        this.repository.update(job, {
          status: cancelled
            ? generationCompleted && plan.preset.providerId === 'gemini'
              ? 'completed_after_cancel'
              : ambiguous
                ? 'cancellation_unknown'
                : 'cancelled'
            : ambiguous
              ? 'submission_unknown'
              : 'failed',
          error: {
            code: error instanceof AssistantError ? error.code : 'generation_failed',
            message: ambiguous
              ? 'Chưa xác nhận kết quả Gemini; yêu cầu có thể đã tính phí. Không tự tạo lại.'
              : error instanceof AssistantError
                ? error.message
                : 'Không hoàn tất tạo cảnh. Media và dự án được giữ.',
            retryable: plan.preset.providerId === 'core',
          },
        });
        this.emit();
      }
    } finally {
      // Promoted files without a ready grant remain quarantined for explicit recovery.
      if (
        !this.stopped &&
        prepared &&
        this.repository.job(initial.id)?.status !== 'ready' &&
        fs.existsSync(directory)
      ) {
        try {
          fs.writeFileSync(
            path.join(directory, 'job.json'),
            JSON.stringify({
              jobId: initial.id,
              storageKey: prepared.storageKey,
              quarantined: true,
            }),
          );
        } catch {
          /* The durable job remains failed when its temporary journal is unavailable. */
        }
      }
      this.active.delete(initial.id);
    }
  }
  suspend(): void {
    for (const controller of this.active.values()) controller.abort();
    if (this.releaseWorkspace) this.repository.invalidatePending();
    this.google.cancel();
    this.emit();
  }
  dispose(): void {
    this.stopped = true;
    for (const id of this.active.keys()) {
      const job = this.repository.job(id);
      if (job && !isTerminalGenerationJob(job))
        this.repository.update(job, {
          status:
            this.repository.plan(job.planId)?.preset.providerId === 'gemini' &&
            job.status !== 'queued'
              ? 'submission_unknown'
              : 'interrupted',
          error: {
            code: 'app_closed',
            message: 'App đã đóng. Tác vụ không tự chạy lại.',
            retryable: false,
          },
        });
    }
    this.suspend();
    this.releaseWorkspace?.();
    this.releaseWorkspace = undefined;
    this.listeners.clear();
  }
}
