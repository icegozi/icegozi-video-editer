import React from 'react';
import { useEditor } from '../../state/editorStore';
import { FormulaSceneConfig } from '../../../domain/video/Scene';
import { Input } from '../ui/Input';
import { Slider } from '../ui/Slider';
import { getMinSceneDuration } from '../../../domain/video/sceneDuration';

export interface FormulaInspectorProps {
  scene: FormulaSceneConfig;
}

export const FormulaInspector: React.FC<FormulaInspectorProps> = ({ scene }) => {
  const { state, dispatch } = useEditor();

  const update = (updates: Partial<FormulaSceneConfig>) => {
    dispatch({ type: 'UPDATE_SCENE', sceneId: scene.id, updates });
  };

  const durationSec = (scene.durationInFrames / state.project.fps).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '12px' }}>
      <div style={{ borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)', paddingBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary, #17233B)' }}>
          Thuộc tính Công thức Toán học
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)' }}>ID: {scene.id}</p>
      </div>

      {/* LaTeX Input */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
          Biểu thức LaTeX
        </label>
        <textarea
          value={scene.latex}
          onChange={(e) => update({ latex: e.target.value })}
          rows={3}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 'var(--radius-controlSm, 6px)',
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border-subtle, #E2E8F0)',
            color: 'var(--color-text-primary, #17233B)',
            fontSize: '13px',
            fontFamily: 'var(--font-mono, monospace)',
            boxSizing: 'border-box',
            outline: 'none',
            resize: 'vertical',
          }}
          placeholder="Ví dụ: e^{i\pi} + 1 = 0"
        />
      </div>

      {/* Formula Title */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
          Tên công thức
        </label>
        <Input
          value={scene.title || ''}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Ví dụ: Định luật Euler…"
        />
      </div>

      {/* Explanation */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
          Giải thích / Chú thích
        </label>
        <textarea
          value={scene.explanation || ''}
          onChange={(e) => update({ explanation: e.target.value })}
          rows={2}
          style={{
            width: '100%',
            padding: '6px 10px',
            borderRadius: 'var(--radius-controlSm, 6px)',
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            border: '1px solid var(--color-border-subtle, #E2E8F0)',
            color: 'var(--color-text-primary, #17233B)',
            fontSize: '11px',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            outline: 'none',
            resize: 'vertical',
          }}
          placeholder="Chú thích thêm tùy chọn…"
        />
      </div>

      {/* Font Size */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)' }}>Cỡ chữ</label>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
            {scene.fontSize || 72}px
          </span>
        </div>
        <Slider
          min={32}
          max={120}
          step={2}
          value={scene.fontSize || 72}
          onChange={(val) => update({ fontSize: Math.round(val) })}
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

      {/* Colors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
            Màu chữ
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="color"
              value={scene.textColor || '#F8FAFC'}
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
              value={scene.textColor || '#F8FAFC'}
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
              value={scene.backgroundColor || '#0F172A'}
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
              value={scene.backgroundColor || '#0F172A'}
              onChange={(e) => update({ backgroundColor: e.target.value })}
              style={{ height: '28px', fontSize: '11px' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
