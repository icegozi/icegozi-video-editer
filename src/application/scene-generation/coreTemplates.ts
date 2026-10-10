import { CoreSceneSchema, type CoreScene } from './coreScene.schema';

export const CORE_TEMPLATES = [
  {
    id: 'growing-text',
    name: 'Chữ lớn dần',
    description: 'Chữ phóng lớn giữa nền tối; dựng tại máy.',
  },
  {
    id: 'fox-eating-grass',
    name: 'Cáo ăn cỏ hoạt họa',
    description: 'Cáo vector cúi đầu và nhai; đây là hoạt họa, không phải clip chân thực.',
  },
] as const;

export function coreTemplate(
  id: string,
  width: number,
  height: number,
  duration: number,
  title = 'A',
): CoreScene {
  if (id === 'growing-text')
    return CoreSceneSchema.parse({
      backgroundColor: '#000000',
      nodes: [
        {
          id: 'letter',
          type: 'text',
          x: width / 2,
          y: height / 2,
          text: title,
          fontSize: Math.min(height * 0.3, 250),
          animations: ['scaleX', 'scaleY'].map((property) => ({
            property,
            keyframes: [
              { time: 0, value: 0.25 },
              { time: duration, value: 1.5 },
            ],
          })),
        },
      ],
    });
  if (id !== 'fox-eating-grass') throw new Error('Unknown core template');
  return CoreSceneSchema.parse({
    backgroundColor: '#CBEAF5',
    nodes: [
      {
        id: 'ground',
        type: 'rect',
        x: 0,
        y: height * 0.65,
        width,
        height: height * 0.35,
        fill: '#87BC64',
      },
      {
        id: 'fox',
        type: 'group',
        x: width * 0.43,
        y: height * 0.68,
        scaleX: height / 500,
        scaleY: height / 500,
      },
      {
        id: 'tail',
        parentId: 'fox',
        type: 'path',
        d: 'M -70 -45 Q -190 -150 -210 -80 Q -205 -5 -80 -5 Z',
        fill: '#D96B29',
        animations: [
          {
            property: 'rotation',
            repeat: true,
            keyframes: [
              { time: 0, value: -3 },
              { time: 1, value: 3 },
              { time: 2, value: -3 },
            ],
          },
        ],
      },
      {
        id: 'tail-tip',
        parentId: 'fox',
        type: 'path',
        d: 'M -170 -97 Q -206 -126 -210 -80 Q -207 -38 -178 -25 Z',
        fill: '#FFF3DE',
      },
      {
        id: 'body',
        parentId: 'fox',
        type: 'ellipse',
        rx: 105,
        ry: 60,
        y: -60,
        fill: '#DF7938',
      },
      {
        id: 'leg-back',
        parentId: 'fox',
        type: 'rect',
        x: -75,
        y: -48,
        width: 23,
        height: 60,
        fill: '#8A4429',
      },
      {
        id: 'leg-front',
        parentId: 'fox',
        type: 'rect',
        x: 48,
        y: -40,
        width: 22,
        height: 53,
        fill: '#8A4429',
      },
      {
        id: 'head',
        parentId: 'fox',
        type: 'group',
        x: 77,
        y: -67,
        animations: [
          {
            property: 'rotation',
            repeat: true,
            keyframes: [
              { time: 0, value: -10 },
              { time: 0.7, value: 32 },
              { time: 1.6, value: 32 },
              { time: 2.4, value: -10 },
            ],
          },
        ],
      },
      {
        id: 'face',
        parentId: 'head',
        type: 'path',
        d: 'M -12 -28 L 20 -47 L 53 -20 L 89 4 L 38 28 L -10 12 Z',
        fill: '#EC8538',
      },
      {
        id: 'ear',
        parentId: 'head',
        type: 'path',
        d: 'M 7 -32 L 15 -83 L 38 -43 Z',
        fill: '#8A4429',
      },
      {
        id: 'muzzle',
        parentId: 'head',
        type: 'path',
        d: 'M 36 4 L 89 4 L 38 28 Z',
        fill: '#FFF3DE',
      },
      {
        id: 'jaw',
        parentId: 'head',
        type: 'path',
        x: 36,
        y: 9,
        d: 'M 0 0 L 48 -4 L 5 19 Z',
        fill: '#FFE9C5',
        animations: [
          {
            property: 'rotation',
            repeat: true,
            keyframes: [
              { time: 0, value: 0 },
              { time: 0.18, value: 12 },
              { time: 0.36, value: 0 },
            ],
          },
        ],
      },
      {
        id: 'nose',
        parentId: 'head',
        type: 'ellipse',
        x: 87,
        y: 3,
        rx: 7,
        ry: 5,
        fill: '#293641',
      },
      {
        id: 'eye',
        parentId: 'head',
        type: 'ellipse',
        x: 40,
        y: -18,
        rx: 4,
        ry: 5,
        fill: '#293641',
      },
      {
        id: 'grass',
        type: 'path',
        x: width * 0.59,
        y: height * 0.73,
        scaleX: height / 500,
        scaleY: height / 500,
        d: 'M 0 0 L -14 -50 L 4 -14 L 13 -61 L 16 -16 L 32 -47 L 26 0 Z',
        fill: '#2E793B',
      },
    ],
  });
}
