import { z } from 'zod';
import { VideoProjectSchema } from '../../schemas/project.schema';

export const SnapshotSchema = z.object({
  project: VideoProjectSchema,
  revision: z.number().int().nonnegative(),
  selectedClipId: z.string().nullable(),
  playhead: z.number().int().nonnegative(),
}).strict();
export type ProjectSnapshot = z.infer<typeof SnapshotSchema>;

export const ProposalSchema = z.object({
  id: z.string().uuid(),
  epoch: z.string().uuid(),
  projectId: z.string().min(1),
  baseRevision: z.number().int().nonnegative(),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  summary: z.string().min(1).max(2000),
  affected: z.array(z.string().max(200)).max(500),
  warnings: z.array(z.string().max(500)).max(50),
  candidate: VideoProjectSchema,
}).strict();
export type ProjectProposal = z.infer<typeof ProposalSchema>;

export interface AssistantAuth {
  status: 'disconnected' | 'connecting' | 'connected' | 'reauth_required';
  sharing: boolean;
  profileId?: string;
  profileLabel?: string;
  identity?: { name?: string; email?: string };
  error?: { code: string; message: string; retryable: boolean };
}
export interface AssistantProfile {
  id: string;
  label: string;
  status: AssistantAuth['status'];
  sharing: boolean;
  pending?: boolean;
}
export interface AssistantRender {
  profile?: 'preview' | 'final';
  requestId?: string;
  id: string;
  projectId: string;
  fingerprint: string;
  status: string;
  progress: number;
  downloadUrl: string | null;
}
export interface AssistantConversation {
  id: string;
  epoch: string;
  projectId: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'interrupted';
  messages: { id: string; role: 'user' | 'assistant'; text: string }[];
  proposals: ProjectProposal[];
  renders: AssistantRender[];
  approvals: { id: string; tool: string; description: string }[];
  progress: string;
  error: string | null;
}
export interface AssistantEvent {
  id: number;
  conversation: AssistantConversation;
}
export interface AssistantStatus {
  bridgeEpoch: string;
  auth: AssistantAuth;
  profiles: AssistantProfile[];
  models: { slug: string; displayName: string }[];
  runtime: { available: boolean; version: string; message: string };
  loginUrl: string | null;
}
