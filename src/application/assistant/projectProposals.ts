import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { VideoProject } from '../../domain/video/VideoProject';
import { VideoProjectSchema } from '../../schemas/project.schema';
import { buildTimeline } from '../timeline/buildTimeline';
import { ProposalSchema, type ProjectProposal } from './assistant.contracts';

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.entries(value).filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  }
  return JSON.stringify(value) ?? 'null';
}

export function projectFingerprint(project: VideoProject): string {
  return bytesToHex(sha256(new TextEncoder().encode(canonical(VideoProjectSchema.parse(project)))));
}

export function projectAssets(project: VideoProject): string[] {
  return [...new Set([
    ...project.scenes.flatMap((scene) => 'src' in scene ? [scene.src] : []),
    ...(project.audioTracks ?? []).map((track) => track.src),
  ])];
}

import { getSceneTrackId } from '../../domain/video/trackUtils';

export function validateLockedContent(base: VideoProject, candidate: VideoProject): void {
  const settings = base.trackSettings ?? {};
  const anyLocked = Object.values(settings).some((s) => s.locked);
  if (anyLocked && (base.fps !== candidate.fps || base.width !== candidate.width || base.height !== candidate.height)) {
    throw new Error('Không được đổi canvas/fps khi có track khóa.');
  }

  const baseTimeline = buildTimeline(base);
  const nextTimeline = buildTimeline(candidate);

  for (const track of ['V1', 'V2'] as const) {
    if (!settings[track]?.locked) continue;
    const baseScenesOnTrack = baseTimeline.computedScenes.filter(
      ({ scene }) => getSceneTrackId(scene, base.scenes) === track
    );
    const candidateScenesOnTrack = nextTimeline.computedScenes.filter(
      ({ scene }) => getSceneTrackId(scene, candidate.scenes) === track
    );
    if (canonical(baseScenesOnTrack) !== canonical(candidateScenesOnTrack)) {
      throw new Error(`Track ${track} đang khóa.`);
    }
  }

  for (const audio of base.audioTracks ?? []) {
    if (settings[audio.id]?.locked && canonical(audio) !== canonical(candidate.audioTracks?.find((t) => t.id === audio.id))) {
      throw new Error(`Audio track "${audio.id}" đang khóa.`);
    }
  }

  if (settings.subtitles?.locked && canonical(base.subtitles) !== canonical(candidate.subtitles)) {
    throw new Error('Subtitle track đang khóa.');
  }
}

export interface CandidateAssetPolicy { allowedNewAssetKeys: ReadonlySet<string>; mediaMetadata?: ReadonlyMap<string, { durationInSeconds: number }> }
export function validateCandidate(base: VideoProject, raw: unknown, policy?: CandidateAssetPolicy): ReturnType<typeof VideoProjectSchema.parse> {
  const candidate = VideoProjectSchema.parse(raw);
  if (candidate.id !== base.id) throw new Error('Proposal phải thuộc project đang mở.');
  if (canonical(base.metadata) !== canonical(candidate.metadata)) throw new Error('AI không được thay metadata tùy ý.');
  const assets = new Set([...projectAssets(base), ...(policy?.allowedNewAssetKeys ?? [])]);
  if (projectAssets(candidate).some((src) => !assets.has(src))) throw new Error('Thiếu media: chỉ được dùng asset của snapshot.');
  for (const scene of candidate.scenes) if (scene.type === 'video') {
    const metadata = policy?.mediaMetadata?.get(scene.src);
    if (metadata && ((scene.startFromFrame ?? 0) + scene.durationInFrames * (scene.playbackRate ?? 1)) / candidate.fps > metadata.durationInSeconds + 0.5 / candidate.fps) {
      throw new Error('Thời lượng hoặc offset cảnh vượt media đã tạo.');
    }
  }
  const settings = base.trackSettings ?? {};
  for (const [id, setting] of Object.entries(settings)) {
    if (setting.locked && canonical(setting) !== canonical(candidate.trackSettings?.[id])) {
      throw new Error('Không được thay đổi track đang khóa.');
    }
  }
  validateLockedContent(base, candidate);
  buildTimeline(candidate);
  return candidate;
}

export function validateProposal(base: VideoProject, revision: number, epoch: string | null, raw: unknown, policy?: CandidateAssetPolicy): ProjectProposal {
  const proposal = ProposalSchema.parse(raw);
  if (proposal.epoch !== epoch || proposal.projectId !== base.id || proposal.baseRevision !== revision || proposal.fingerprint !== projectFingerprint(base)) {
    throw new Error('Project hoặc phiên đã thay đổi. Hãy tạo proposal mới.');
  }
  validateCandidate(base, proposal.candidate, policy);
  return proposal;
}
