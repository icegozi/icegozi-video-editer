import type {
  GenerationJob,
  GenerationOwner,
  GenerationPlan,
  RegisteredAsset,
} from '../generation.contracts';

export interface SceneGenerationRepository {
  readonly workspaceKey: string;
  plan(id: string): GenerationPlan | null;
  plans(owner: GenerationOwner): GenerationPlan[];
  savePlan(plan: GenerationPlan): void;
  job(id: string): GenerationJob | null;
  jobForPlan(id: string): GenerationJob | null;
  duplicate(prepared: RegisteredAsset): RegisteredAsset | null;
  invalidatePending(): void;
  jobs(): GenerationJob[];
  approve(plan: GenerationPlan): GenerationJob;
  update(job: GenerationJob, changes: Partial<GenerationJob>): GenerationJob;
  assets(owner: GenerationOwner): RegisteredAsset[];
  importAsset(owner: GenerationOwner, prepared: RegisteredAsset): RegisteredAsset;
  complete(job: GenerationJob, prepared: RegisteredAsset): RegisteredAsset;
}

export interface GeneratedAssetStore {
  prepare(
    file: string,
    kind: 'image' | 'video',
    claimedMime: string,
    jobId: string,
    signal: AbortSignal,
  ): Promise<RegisteredAsset>;
  file(asset: RegisteredAsset): string;
  verify(asset: RegisteredAsset): Promise<void>;
  discardUnregistered(asset: RegisteredAsset): void;
}
