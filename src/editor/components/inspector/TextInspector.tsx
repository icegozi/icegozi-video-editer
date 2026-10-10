import React from 'react';
import { useEditor } from '../../state/editorStore';
import { TextSceneConfig } from '../../../domain/video/Scene';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { getMinSceneDuration } from '../../../domain/video/sceneDuration';

export interface TextInspectorProps {
  scene: TextSceneConfig;
}

export const TextInspector: React.FC<TextInspectorProps> = ({ scene }) => {
  const { state, dispatch } = useEditor();

  const update = (updates: Partial<TextSceneConfig>) => {
    dispatch({ type: 'UPDATE_SCENE', sceneId: scene.id, updates });
  };

  const durationSec = (scene.durationInFrames / state.project.fps).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '12px' }}>
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Text Scene Inspector
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>ID: {scene.id}</p>
      </div>

      {/* Title */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Headline / Title
        </label>
        <Input
          value={scene.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Main Title"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Subtitle
        </label>
        <Input
          value={scene.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          placeholder="Optional Subtitle"
        />
      </div>

      {/* Animation Type */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Animation Type
        </label>
        <Select
          value={scene.animationType || 'fade'}
          options={[
            { value: 'fade', label: 'Fade In / Out' },
            { value: 'slide-up', label: 'Slide Up' },
            { value: 'typewriter', label: 'Typewriter' },
          ]}
          onChange={(e) => update({ animationType: e.target.value as any })}
        />
      </div>

      {/* Duration */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Duration</label>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {scene.durationInFrames} frames ({durationSec}s)
          </span>
        </div>
        <Slider
          min={getMinSceneDuration(state.project, scene.id)}
          max={300}
          step={5}
          value={scene.durationInFrames}
          onChange={(val) => {
            const minDur = getMinSceneDuration(state.project, scene.id);
            update({ durationInFrames: Math.max(minDur, Math.round(val)) });
          }}
        />
      </div>

      {/* Colors: Text & Background */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Text Color
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="color"
              value={scene.textColor || '#FFFFFF'}
              onChange={(e) => update({ textColor: e.target.value })}
              style={{
                width: '28px',
                height: '28px',
                padding: 0,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: 'transparent',
              }}
            />
            <Input
              value={scene.textColor || '#FFFFFF'}
              onChange={(e) => update({ textColor: e.target.value })}
              style={{ height: '28px', fontSize: '11px' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Background
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="color"
              value={scene.backgroundColor || '#070A12'}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              style={{
                width: '28px',
                height: '28px',
                padding: 0,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: 'transparent',
              }}
            />
            <Input
              value={scene.backgroundColor || '#070A12'}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              style={{ height: '28px', fontSize: '11px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
