import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../../config/paths.config';
import { AssistantError } from './errors';

export const VIDEO_SKILL_IDS = ['icegozi-video-workflow', 'icegozi-short-video', 'icegozi-text-motion',
  'icegozi-timeline-edit', 'icegozi-audio-captions', 'icegozi-render-check'] as const;
export const VIDEO_SKILLS_VERSION = '1.0.0';

export function readVideoSkill(id: string, root = path.join(PATHS.root, 'skills', 'video')) {
  if (!VIDEO_SKILL_IDS.includes(id as typeof VIDEO_SKILL_IDS[number])) {
    throw new AssistantError('skill_unknown', 'Skill không thuộc bộ công cụ video của ứng dụng.');
  }
  try {
    const directory = fs.realpathSync(root);
    const file = fs.realpathSync(path.join(directory, id, 'SKILL.md'));
    const relative = path.relative(directory, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || fs.statSync(file).size > 24 * 1024) throw new Error('Unsafe skill');
    const instructions = fs.readFileSync(file, 'utf8');
    const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(instructions)?.[1];
    const name = /^name:\s*(.+)$/m.exec(header ?? '')?.[1].trim();
    const description = /^description:\s*(.+)$/m.exec(header ?? '')?.[1].trim();
    if (name !== id || !description) throw new Error('Invalid skill');
    return { id, name, description, version: VIDEO_SKILLS_VERSION, instructions };
  } catch {
    throw new AssistantError('skill_bundle_invalid', 'Bộ skill video thiếu hoặc không hợp lệ. Cài lại đầy đủ bộ ứng dụng.');
  }
}

export function listVideoSkills(root?: string) {
  return VIDEO_SKILL_IDS.map((id) => {
    const { instructions: _instructions, ...metadata } = readVideoSkill(id, root);
    return metadata;
  });
}
