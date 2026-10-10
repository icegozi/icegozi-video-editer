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
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Mathematical Formula Inspector
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>ID: {scene.id}</p>
      </div>

      {/* LaTeX Input */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          LaTeX Expression
        </label>
        <textarea
          value={scene.latex}
          onChange={(e) => update({ latex: e.target.value })}
          rows={3}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontFamily: 'monospace',
            boxSizing: 'border-box',
            outline: 'none',
            resize: 'vertical',
          }}
          placeholder="e.g. e^{i\\pi} + 1 = 0"
        />
      </div>

      {/* Formula Title */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Equation Title
        </label>
        <Input
          value={scene.title || ''}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="e.g. Euler's Identity"
        />
      </div>

      {/* Explanation */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Explanation / Caption
        </label>
        <textarea
          value={scene.explanation || ''}
          onChange={(e) => update({ explanation: e.target.value })}
          rows={2}
          style={{
            width: '100%',
            padding: '6px 10px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            fontSize: '11px',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            outline: 'none',
            resize: 'vertical',
          }}
          placeholder="Optional explanation..."
        />
      </div>

      {/* Font Size */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Font Size</label>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
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

      {/* Colors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Text Color
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
                border: 'none',
                borderRadius: '4px',
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
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Background
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
                border: 'none',
                borderRadius: '4px',
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
