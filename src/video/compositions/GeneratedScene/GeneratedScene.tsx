import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  CoreSceneSchema,
  type CoreNode,
  type CoreScene,
} from '../../../application/scene-generation/coreScene.schema';

export function animatedNode(node: CoreNode, seconds: number): CoreNode {
  const result = { ...node };
  for (const animation of node.animations) {
    const frames = animation.keyframes;
    const first = frames[0];
    const last = frames[frames.length - 1];
    const span = last.time - first.time;
    const time =
      animation.repeat && seconds >= first.time
        ? first.time + ((seconds - first.time) % span)
        : seconds;
    let value = time <= first.time ? first.value : last.value;
    for (let i = 1; i < frames.length; i++)
      if (time >= frames[i - 1].time && time <= frames[i].time) {
        const progress = (time - frames[i - 1].time) / (frames[i].time - frames[i - 1].time);
        value = frames[i - 1].value + (frames[i].value - frames[i - 1].value) * progress;
        break;
      }
    result[animation.property] = value;
  }
  return result;
}

export function SceneSvg({
  scene,
  width,
  height,
  seconds,
}: {
  scene: CoreScene;
  width: number;
  height: number;
  seconds: number;
}) {
  const render = (input: CoreNode): React.ReactNode => {
    const node = animatedNode(input, seconds);
    const shape =
      node.type === 'ellipse' ? (
        <ellipse rx={node.rx} ry={node.ry} />
      ) : node.type === 'rect' ? (
        <rect width={node.width} height={node.height} />
      ) : node.type === 'path' ? (
        <path d={node.d} />
      ) : node.type === 'text' ? (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Arial, sans-serif"
          fontSize={node.fontSize ?? 72}
        >
          {node.text}
        </text>
      ) : null;
    return (
      <g
        key={node.id}
        transform={`translate(${node.x} ${node.y}) rotate(${node.rotation}) scale(${node.scaleX} ${node.scaleY})`}
        opacity={node.opacity}
        fill={node.fill}
        stroke={node.stroke}
        strokeWidth={node.strokeWidth}
      >
        {shape}
        {node.type === 'group'
          ? scene.nodes.filter((child) => child.parentId === node.id).map(render)
          : null}
      </g>
    );
  };
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={width} height={height} fill={scene.backgroundColor} />
      {scene.nodes.filter((node) => !node.parentId).map(render)}
    </svg>
  );
}
export const GeneratedScene: React.FC<{
  sceneSpec: CoreScene;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
}> = ({ sceneSpec }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const scene = CoreSceneSchema.parse(sceneSpec);
  return (
    <AbsoluteFill>
      <SceneSvg scene={scene} width={width} height={height} seconds={frame / fps} />
    </AbsoluteFill>
  );
};
