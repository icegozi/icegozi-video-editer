import { z } from 'zod';
import { CoreSceneSchema } from './coreScene.schema';

export const GenerationIntentSchema = z
  .object({
    placement: z.enum(['append', 'replace']).default('append'),
    replaceSceneId: z.string().min(1).max(200).optional(),
    timelineDurationSeconds: z.number().positive().max(30).optional(),
    objectFit: z.enum(['cover', 'contain']).default('cover'),
  })
  .strict();
export const GenerationRequestSchema = z
  .object({
    kind: z.enum(['image', 'video']),
    prompt: z.string().trim().min(1).max(4000),
    presetId: z.string().min(1).max(100),
    durationSeconds: z.number().int().positive().max(30).optional(),
    referenceAssetIds: z.array(z.string().uuid()).max(1).default([]),
    sceneSpec: CoreSceneSchema.optional(),
    templateId: z.enum(['growing-text', 'fox-eating-grass']).optional(),
    title: z.string().min(1).max(100).optional(),
    intent: GenerationIntentSchema.default({
      placement: 'append',
      objectFit: 'cover',
    }),
  })
  .strict();
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
export interface GenerationOwner {
  profileId: string;
  conversationId: string;
  epoch: string;
  projectId: string;
  turnId?: string;
}
export interface GenerationPreset {
  id: string;
  label: string;
  kind: 'image' | 'video';
  providerId: 'core' | 'gemini';
  model: string;
  ratio: string;
  width: number;
  height: number;
  durations: number[];
  maxPromptLength: number;
  supportsReference: boolean;
}
export const RegisteredAssetSchema = z
  .object({
    id: z.string().uuid(),
    storageKey: z
      .string()
      .regex(/^assets\/(images|video|audio)\/[a-f0-9-]+\.(png|jpg|webp|mp4|mp3|wav|ogg)$/),
    mediaType: z.enum(['image', 'video', 'audio']),
    mimeType: z.string().max(100),
    fileSizeBytes: z.number().int().positive(),
    hash: z.string().regex(/^[a-f0-9]{64}$/),
    metadata: z
      .object({
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
        durationInSeconds: z.number().nonnegative(),
        fps: z.number().positive().optional(),
        videoCodec: z.string().optional(),
        audioCodec: z.string().optional(),
        sampleRate: z.number().optional(),
        channels: z.number().optional(),
        pixelFormat: z.string().optional(),
        bitrate: z.number().optional(),
      })
      .strict(),
    origin: z.enum(['generated', 'imported']),
    jobId: z.string().uuid().optional(),
  })
  .strict();
export type RegisteredAsset = z.infer<typeof RegisteredAssetSchema>;
export interface GenerationConnection {
  id: string;
  version: string;
  providerId: string;
  label: string;
  maxJobCostMicros: number;
  dailyBudgetMicros: number;
}
export interface GoogleConnectionStatus {
  configured: boolean;
  authMode?: 'oauth' | 'api_key';
  status: 'disconnected' | 'connecting' | 'connected' | 'reauth_required';
  projectId?: string;
  identity?: { email?: string; name?: string };
  connection: GenerationConnection | null;
  loginUrl: string | null;
  error: string | null;
}
export type GeminiCredential =
  | {
      accessToken: string;
      projectId: string;
      version: string;
      apiKey?: never;
    }
  | {
      apiKey: string;
      version: string;
      accessToken?: never;
      projectId?: never;
    };
export interface GoogleConnection {
  status(owner: string): Promise<GoogleConnectionStatus>;
  configure(owner: string, raw: unknown): Promise<void>;
  start(owner: string): Promise<void>;
  cancel(owner?: string): void;
  disconnect(owner: string): Promise<void>;
  credential(owner: string, version: string): Promise<GeminiCredential>;
}
export interface GenerationEstimate {
  costMicros: number;
  currency: 'USD';
  pricingVersion: string;
  source: string;
  verifiedAt: string;
  expiresAt: number;
  isEstimate: true;
}
export interface GenerationPlan extends GenerationOwner {
  id: string;
  request: GenerationRequest;
  digest: string;
  baseRevision: number;
  fingerprint: string;
  connection: GenerationConnection | null;
  preset: GenerationPreset;
  referenceHashes: string[];
  estimate: GenerationEstimate;
  fps: number;
  status: 'draft' | 'awaiting_approval' | 'approved' | 'declined' | 'expired' | 'invalidated';
  createdAt: number;
  expiresAt: number;
}
export const GENERATION_TERMINAL = [
  'ready',
  'failed',
  'cancelled',
  'completed_after_cancel',
  'submission_unknown',
  'cancellation_unknown',
] as const;
export type GenerationJobState =
  | 'queued'
  | 'submitting'
  | 'submitted'
  | 'processing'
  | 'downloading'
  | 'validating'
  | 'cancel_requested'
  | 'interrupted'
  | (typeof GENERATION_TERMINAL)[number];
export interface GenerationJob extends GenerationOwner {
  id: string;
  planId: string;
  providerTaskId?: string;
  status: GenerationJobState;
  version: number;
  createdAt: number;
  updatedAt: number;
  nextPollAt: number;
  attempts: number;
  cancellationRequested: boolean;
  assetId?: string;
  error?: { code: string; message: string; retryable: boolean };
  progress?: number;
}
export function isTerminalGenerationJob(job: GenerationJob): boolean {
  return (
    GENERATION_TERMINAL.includes(job.status as (typeof GENERATION_TERMINAL)[number]) ||
    job.status === 'interrupted'
  );
}
export interface GenerationStatus {
  requestId: string;
  plan: GenerationPlan;
  job?: GenerationJob;
  asset?: RegisteredAsset;
}
export interface GenerationCapabilities {
  supported: true;
  available: boolean;
  reason?: string;
  connection: GenerationConnection | null;
  presets: GenerationPreset[];
  pricing: {
    version: string;
    source: string;
    verifiedAt: string;
    expiresAt: number;
  };
  limits: {
    maxActiveJobs: number;
    maxConversationJobs: number;
    maxOutputBytes: number;
    maxReferenceBytes: number;
  };
}
export interface GenerationOverview {
  capabilities: GenerationCapabilities;
  requests: GenerationStatus[];
  assets: RegisteredAsset[];
}
export const ProposalReservationSchema = z
  .object({
    attemptId: z.string().uuid(),
    expiresAt: z.number().int().positive(),
  })
  .strict();
