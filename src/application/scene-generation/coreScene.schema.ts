import { z } from 'zod';

const color = z.string().regex(/^#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/);
const coordinate = z.number().min(-4096).max(4096);
export const CoreAnimationSchema = z
  .object({
    property: z.enum(['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity']),
    repeat: z.boolean().default(false),
    keyframes: z
      .array(z.object({ time: z.number().min(0).max(30), value: coordinate }).strict())
      .min(2)
      .max(24),
  })
  .strict();
export const CoreNodeSchema = z
  .object({
    id: z.string().min(1).max(64),
    parentId: z.string().min(1).max(64).optional(),
    type: z.enum(['group', 'ellipse', 'rect', 'path', 'text']),
    x: coordinate.default(0),
    y: coordinate.default(0),
    rotation: coordinate.default(0),
    scaleX: z.number().min(0.01).max(20).default(1),
    scaleY: z.number().min(0.01).max(20).default(1),
    opacity: z.number().min(0).max(1).default(1),
    fill: color.default('#FFFFFF'),
    stroke: color.optional(),
    strokeWidth: z.number().min(0).max(40).default(0),
    width: z.number().positive().max(4096).optional(),
    height: z.number().positive().max(4096).optional(),
    rx: z.number().positive().max(2048).optional(),
    ry: z.number().positive().max(2048).optional(),
    d: z
      .string()
      .min(1)
      .max(4000)
      .regex(/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,+\-\s]+$/)
      .optional(),
    text: z.string().min(1).max(500).optional(),
    fontSize: z.number().min(8).max(512).optional(),
    animations: z.array(CoreAnimationSchema).max(6).default([]),
  })
  .strict();
export const CoreSceneSchema = z
  .object({
    backgroundColor: color.default('#0F172A'),
    nodes: z.array(CoreNodeSchema).min(1).max(128),
  })
  .strict()
  .superRefine((scene, context) => {
    const nodes = new Map(scene.nodes.map((node) => [node.id, node]));
    if (nodes.size !== scene.nodes.length)
      context.addIssue({
        code: 'custom',
        path: ['nodes'],
        message: 'Node IDs phải duy nhất.',
      });
    scene.nodes.forEach((node, index) => {
      for (const [field, type] of [
        ['width', 'rect'],
        ['height', 'rect'],
        ['rx', 'ellipse'],
        ['ry', 'ellipse'],
        ['d', 'path'],
        ['text', 'text'],
        ['fontSize', 'text'],
      ] as const) {
        if (node[field] !== undefined && node.type !== type)
          context.addIssue({
            code: 'custom',
            path: ['nodes', index, field],
            message: 'Field không thuộc loại node này.',
          });
      }
      if (
        (node.type === 'path' && !node.d) ||
        (node.type === 'text' && !node.text) ||
        (node.type === 'ellipse' && (!node.rx || !node.ry)) ||
        (node.type === 'rect' && (!node.width || !node.height))
      )
        context.addIssue({
          code: 'custom',
          path: ['nodes', index],
          message: 'Thiếu dữ liệu hình.',
        });
      let parent = node.parentId;
      const seen = new Set([node.id]);
      while (parent) {
        if (seen.has(parent) || seen.size > 12 || nodes.get(parent)?.type !== 'group') {
          context.addIssue({
            code: 'custom',
            path: ['nodes', index, 'parentId'],
            message: 'Nhóm cha không hợp lệ hoặc có vòng lặp.',
          });
          break;
        }
        seen.add(parent);
        parent = nodes.get(parent)?.parentId;
      }
      for (const animation of node.animations) {
        if (
          new Set(animation.keyframes.map((frame) => frame.time)).size !==
            animation.keyframes.length ||
          animation.keyframes.some(
            (frame, i) => i > 0 && frame.time <= animation.keyframes[i - 1].time,
          )
        ) {
          context.addIssue({
            code: 'custom',
            path: ['nodes', index, 'animations'],
            message: 'Keyframe times phải tăng dần.',
          });
        }
        if (
          animation.keyframes.some((frame) =>
            animation.property === 'opacity'
              ? frame.value < 0 || frame.value > 1
              : animation.property.startsWith('scale')
                ? frame.value < 0.01 || frame.value > 20
                : false,
          )
        )
          context.addIssue({
            code: 'custom',
            path: ['nodes', index, 'animations'],
            message: 'Giá trị chuyển động ngoài giới hạn.',
          });
      }
    });
  });
export type CoreScene = z.infer<typeof CoreSceneSchema>;
export type CoreNode = z.infer<typeof CoreNodeSchema>;
