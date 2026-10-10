import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CoreSceneSchema } from '../../src/application/scene-generation/coreScene.schema';
import { coreTemplate } from '../../src/application/scene-generation/coreTemplates';
import {
  animatedNode,
  SceneSvg,
} from '../../src/video/compositions/GeneratedScene/GeneratedScene';

describe('Local core scene data boundary and motion', () => {
  it('rejects executable/remote fields, duplicate nodes, invalid parents and cycles', () => {
    const node = { id: 'a', type: 'text', text: 'A' };
    for (const value of [
      { nodes: [{ ...node, jsx: '<script />' }] },
      { nodes: [node, node] },
      { nodes: [{ ...node, parentId: 'missing' }] },
      {
        nodes: [
          { id: 'a', type: 'group', parentId: 'b' },
          { id: 'b', type: 'group', parentId: 'a' },
        ],
      },
      { nodes: [{ id: 'a', type: 'path', d: 'url(https://outside.invalid)' }] },
    ])
      expect(() => CoreSceneSchema.parse(value)).toThrow();
  });
  it('validates animation order, bounds and a finite repeating span', () => {
    const base = {
      nodes: [
        {
          id: 'a',
          type: 'text',
          text: 'A',
          animations: [
            {
              property: 'opacity',
              keyframes: [
                { time: 0, value: 0 },
                { time: 1, value: 1 },
              ],
            },
          ],
        },
      ],
    };
    expect(CoreSceneSchema.parse(base).nodes).toHaveLength(1);
    expect(() =>
      CoreSceneSchema.parse({
        nodes: [
          {
            ...base.nodes[0],
            animations: [
              {
                property: 'scaleX',
                keyframes: [
                  { time: 0, value: 0 },
                  { time: 0, value: 21 },
                ],
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });
  it('animates the fox head and jaw as articulated vectors, with escaped text', () => {
    const fox = coreTemplate('fox-eating-grass', 1280, 720, 5);
    const head = fox.nodes.find((node) => node.id === 'head')!;
    expect(animatedNode(head, 0).rotation).not.toBe(animatedNode(head, 1).rotation);
    const jaw = fox.nodes.find((node) => node.id === 'jaw')!;
    expect(animatedNode(jaw, 0).rotation).not.toBe(animatedNode(jaw, 0.18).rotation);
    const scene = coreTemplate('growing-text', 1280, 720, 5, '<script>bad</script>');
    const output = renderToStaticMarkup(
      <SceneSvg scene={scene} width={1280} height={720} seconds={1} />,
    );
    expect(output).toContain('&lt;script&gt;');
    expect(output).not.toContain('<script>');
    expect(animatedNode(scene.nodes[0], 4).scaleX).toBeGreaterThan(
      animatedNode(scene.nodes[0], 0).scaleX,
    );
  });
});
