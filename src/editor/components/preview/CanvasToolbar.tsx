import React from 'react';
import { Maximize2, Shield, Eye } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { IconButton } from '../ui/IconButton';

export interface CanvasToolbarProps {
  zoomMode: 'fit' | '50' | '100';
  onZoomChange: (mode: 'fit' | '50' | '100') => void;
  onFullscreenToggle: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  zoomMode,
  onZoomChange,
  onFullscreenToggle,
}) => {
  const { state, dispatch } = useEditor();

  const aspectRatio = `${state.project.width}:${state.project.height}` === '1920:1080' ? '16:9' : 'Custom';

  return (
    <div
      style={{
        height: '36px',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-subtle)',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {/* Left: Resolution & Aspect Ratio Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {state.project.width} × {state.project.height}
        </span>
        <span
          style={{
            fontSize: '10px',
            padding: '1px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            fontWeight: 600,
          }}
        >
          {aspectRatio}
        </span>
      </div>

      {/* Right: Controls (Zoom Mode, Safe Area, Fullscreen) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Zoom Selector */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '4px',
            padding: '2px',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {(['fit', '50', '100'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onZoomChange(mode)}
              style={{
                border: 'none',
                background: zoomMode === mode ? 'var(--bg-active)' : 'transparent',
                color: zoomMode === mode ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '3px',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {mode === 'fit' ? 'Fit' : `${mode}%`}
            </button>
          ))}
        </div>

        <IconButton
          icon={<Shield size={13} />}
          label={state.isSafeAreasVisible ? 'Hide Safe Areas' : 'Show Safe Areas'}
          active={state.isSafeAreasVisible}
          size="sm"
          onClick={() => dispatch({ type: 'TOGGLE_SAFE_AREAS' })}
        />

        <IconButton
          icon={<Maximize2 size={13} />}
          label="Toggle Fullscreen Canvas"
          size="sm"
          onClick={onFullscreenToggle}
        />
      </div>
    </div>
  );
};
