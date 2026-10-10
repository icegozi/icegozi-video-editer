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
      <div style={{ borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)', paddingBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary, #17233B)' }}>
          Thuộc tính Scene Văn bản
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)' }}>ID: {scene.id}</p>
      </div>

      {/* Title */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
          Tiêu đề chính
        </label>
        <Input
          value={scene.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Tiêu đề chính…"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
          Tiêu đề phụ
        </label>
        <Input
          value={scene.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          placeholder="Tiêu đề phụ tùy chọn…"
        />
      </div>

      {/* Animation Type */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
          Hiệu ứng xuất hiện
        </label>
        <Select
          value={scene.animationType || 'fade'}
          options={[
            { value: 'fade', label: 'Làm mờ (Fade)' },
            { value: 'slide-up', label: 'Trượt lên (Slide Up)' },
            { value: 'typewriter', label: 'Máy đánh chữ (Typewriter)' },
          ]}
          onChange={(e) => update({ animationType: e.target.value as any })}
        />
      </div>

      {/* Duration */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)' }}>Thời lượng</label>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
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
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
            Màu chữ
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
                border: '1px solid var(--color-border-subtle, #E2E8F0)',
                borderRadius: 'var(--radius-controlSm, 6px)',
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
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
            Màu nền
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
                border: '1px solid var(--color-border-subtle, #E2E8F0)',
                borderRadius: 'var(--radius-controlSm, 6px)',
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
