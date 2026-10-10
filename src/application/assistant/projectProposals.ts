import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { VideoProject } from '../../domain/video/VideoProject';
import { VideoProjectSchema } from '../../schemas/project.schema';
import { buildTimeline } from '../timeline/buildTimeline';
import { ProposalSchema, type ProjectProposal } from '../../shared/types/assistant';

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

export function validateCandidate(base: VideoProject, raw: unknown): ReturnType<typeof VideoProjectSchema.parse> {
  const candidate = VideoProjectSchema.parse(raw);
  candidate.scenes.forEach((scene, index) => {
    const next = candidate.scenes[index + 1];
    if (next && scene.transition?.type === 'crossfade' && scene.transition.durationInFrames >= next.durationInFrames) {
      throw new Error('Crossfade phải ngắn hơn cả hai scene để tránh chồng ba clip hoặc cắt nội dung.');
    }
  });
  if (candidate.id !== base.id) throw new Error('Proposal phải thuộc project đang mở.');
  const ids = [...candidate.scenes, ...(candidate.audioTracks ?? []), ...(candidate.subtitles ?? [])].map((v) => v.id);
  if (new Set(ids).size !== ids.length) throw new Error('ID scene/audio/subtitle phải duy nhất.');
  if (canonical(base.metadata) !== canonical(candidate.metadata)) throw new Error('AI không được thay metadata tùy ý.');
  const assets = new Set(projectAssets(base));
  if (projectAssets(candidate).some((src) => !assets.has(src))) throw new Error('Thiếu media: chỉ được dùng asset của snapshot.');
  const settings = base.trackSettings ?? {};
  for (const [id, setting] of Object.entries(settings)) {
    if (setting.locked && canonical(setting) !== canonical(candidate.trackSettings?.[id])) {
      throw new Error('Không được thay đổi track đang khóa.');
    }
  }
  const anyLocked = Object.values(settings).some((s) => s.locked);
  if (anyLocked && (base.fps !== candidate.fps || base.width !== candidate.width || base.height !== candidate.height)) {
    throw new Error('Không được đổi canvas/fps khi có track khóa.');
  }
  const baseTimeline = buildTimeline(base);
  const nextTimeline = buildTimeline(candidate);
  const hasPrimary = base.scenes.some((s) => s.type !== 'text' && s.type !== 'formula');
  const nextHasPrimary = candidate.scenes.some((s) => s.type !== 'text' && s.type !== 'formula');
  for (const track of ['V1', 'V2']) {
    if (!settings[track]?.locked) continue;
    const entries = (timeline: typeof baseTimeline, primary: boolean) => timeline.computedScenes.filter(({ scene }) => {
      const overlay = scene.type === 'text' || scene.type === 'formula';
      return track === 'V1' ? !primary || !overlay : primary && overlay;
    });
    if (canonical(entries(baseTimeline, hasPrimary)) !== canonical(entries(nextTimeline, nextHasPrimary))) {
      throw new Error(`Track ${track} đang khóa.`);
    }
  }
  for (const audio of base.audioTracks ?? []) {
    if (settings[audio.id]?.locked && canonical(audio) !== canonical(candidate.audioTracks?.find((t) => t.id === audio.id))) {
      throw new Error('Audio track đang khóa.');
    }
  }
  if (settings.subtitles?.locked && canonical(base.subtitles) !== canonical(candidate.subtitles)) throw new Error('Subtitle track đang khóa.');
  return candidate;
}

export function validateProposal(base: VideoProject, revision: number, epoch: string | null, raw: unknown): ProjectProposal {
  const proposal = ProposalSchema.parse(raw);
  if (proposal.epoch !== epoch || proposal.projectId !== base.id || proposal.baseRevision !== revision || proposal.fingerprint !== projectFingerprint(base)) {
    throw new Error('Project hoặc phiên đã thay đổi. Hãy tạo proposal mới.');
  }
  validateCandidate(base, proposal.candidate);
  return proposal;
}
