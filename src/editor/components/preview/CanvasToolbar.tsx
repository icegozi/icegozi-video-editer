import React from 'react';
import { Maximize2, Shield } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { IconButton, Badge } from '../ui';

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
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
      data-testid="canvas-toolbar"
    >
      {/* Left: Resolution & Aspect Ratio Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          className="tabular-nums"
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-text-secondary, #52627A)',
          }}
        >
          {state.project.width} × {state.project.height}
        </span>
        <Badge variant="default">{aspectRatio}</Badge>
        <span
          className="tabular-nums"
          style={{
            fontSize: '11px',
            color: 'var(--color-text-muted, #64748B)',
          }}
        >
          {state.project.fps} FPS
        </span>
      </div>

      {/* Right: Controls (Zoom Mode, Safe Area, Fullscreen) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Zoom Selector */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--color-surface-muted, #F2F5FA)',
            borderRadius: 'var(--radius-control, 8px)',
            padding: '2px',
            border: '1px solid var(--color-border-subtle, #E2E8F0)',
            gap: '2px',
          }}
        >
          {(['fit', '50', '100'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onZoomChange(mode)}
              style={{
                border: 'none',
                background: zoomMode === mode ? 'var(--color-surface, #FFFFFF)' : 'transparent',
                color: zoomMode === mode ? 'var(--color-primary, #3568E8)' : 'var(--color-text-secondary, #52627A)',
                fontSize: '11px',
                fontWeight: zoomMode === mode ? 600 : 500,
                padding: '2px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: zoomMode === mode ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
                transition: 'all 120ms ease',
              }}
            >
              {mode === 'fit' ? 'Fit' : `${mode}%`}
            </button>
          ))}
        </div>

        <IconButton
          icon={<Shield size={14} />}
          label={state.isSafeAreasVisible ? 'Ẩn vùng an toàn (Safe Area)' : 'Hiện vùng an toàn (Safe Area)'}
          active={state.isSafeAreasVisible}
          size="sm"
          onClick={() => dispatch({ type: 'TOGGLE_SAFE_AREAS' })}
        />

        <IconButton
          icon={<Maximize2 size={14} />}
          label="Toàn màn hình Preview"
          size="sm"
          onClick={onFullscreenToggle}
        />
      </div>
    </div>
  );
};
