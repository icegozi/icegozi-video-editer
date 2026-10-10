import React from 'react';
import {
  MousePointer,
  Scissors,
  Trash2,
  Magnet,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { IconButton, Slider } from '../ui';

export const TimelineToolbar: React.FC = () => {
  const { state, dispatch } = useEditor();

  const handleSplitAtPlayhead = () => {
    if (!state.selectedClipId) return;
    dispatch({
      type: 'SPLIT_SCENE',
      sceneId: state.selectedClipId,
      atFrame: state.currentFrame,
    });
  };

  const handleDeleteSelected = () => {
    if (!state.selectedClipId) return;
    dispatch({
      type: 'DELETE_SCENE',
      sceneId: state.selectedClipId,
    });
  };

  const handleZoom = (delta: number) => {
    dispatch({
      type: 'SET_ZOOM',
      pixelsPerSecond: state.zoomPixelsPerSecond + delta,
    });
  };

  const handleFitTimeline = () => {
    const panelWidths = (state.isInspectorOpen ? 320 : 0) + 380 + 180;
    const availableWidth = typeof window !== 'undefined'
      ? Math.max(400, window.innerWidth - panelWidths - 60)
      : 800;

    const totalSeconds = state.timeline.totalDurationInFrames / state.project.fps;
    if (totalSeconds > 0) {
      const fittedZoom = Math.max(30, Math.min(300, availableWidth / totalSeconds));
      dispatch({ type: 'SET_ZOOM', pixelsPerSecond: Math.round(fittedZoom) });
    }
  };

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
      data-testid="timeline-toolbar"
    >
      {/* Left: Editing Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <IconButton
          icon={<MousePointer size={14} />}
          label="Công cụ chọn (V)"
          active={state.activeTool === 'select'}
          size="sm"
          onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'select' })}
        />
        <IconButton
          icon={<Scissors size={14} />}
          label="Cắt tại Playhead (K)"
          active={state.activeTool === 'split'}
          size="sm"
          onClick={handleSplitAtPlayhead}
          disabled={!state.selectedClipId}
        />
        <IconButton
          icon={<Trash2 size={14} />}
          label="Xóa clip đã chọn (Delete)"
          size="sm"
          onClick={handleDeleteSelected}
          disabled={!state.selectedClipId || state.project.scenes.length <= 1}
        />

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--color-border-subtle, #E2E8F0)', margin: '0 4px' }} />

        {/* Snapping Toggle */}
        <IconButton
          icon={<Magnet size={14} />}
          label={state.snappingEnabled ? 'Tắt bắt dính Snapping (N)' : 'Bật bắt dính Snapping (N)'}
          active={state.snappingEnabled}
          size="sm"
          onClick={() => dispatch({ type: 'SET_SNAPPING', enabled: !state.snappingEnabled })}
        />
      </div>

      {/* Right: Zoom Scale & Fit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IconButton
          icon={<ZoomOut size={14} />}
          label="Thu nhỏ Timeline (-)"
          size="sm"
          onClick={() => handleZoom(-20)}
        />

        <div style={{ width: '84px', display: 'flex', alignItems: 'center' }}>
          <Slider
            min={30}
            max={350}
            step={10}
            value={state.zoomPixelsPerSecond}
            onChange={(val) => dispatch({ type: 'SET_ZOOM', pixelsPerSecond: Math.round(val) })}
          />
        </div>

        <IconButton
          icon={<ZoomIn size={14} />}
          label="Phóng to Timeline (+)"
          size="sm"
          onClick={() => handleZoom(20)}
        />

        <IconButton
          icon={<Maximize2 size={13} />}
          label="Khớp Timeline với màn hình"
          size="sm"
          onClick={handleFitTimeline}
        />
      </div>
    </div>
  );
};
