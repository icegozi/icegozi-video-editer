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
import { IconButton } from '../ui/IconButton';

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
    // Fits entire project duration within typical viewport (e.g., 900px)
    const totalSeconds = state.timeline.totalDurationInFrames / state.project.fps;
    if (totalSeconds > 0) {
      const fittedZoom = Math.max(30, Math.min(300, 900 / totalSeconds));
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
        backgroundColor: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-subtle)',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {/* Left: Editing Tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <IconButton
          icon={<MousePointer size={14} />}
          label="Selection Tool (V)"
          active={state.activeTool === 'select'}
          size="sm"
          onClick={() => dispatch({ type: 'SET_ACTIVE_TOOL', tool: 'select' })}
        />
        <IconButton
          icon={<Scissors size={14} />}
          label="Split at Playhead (K)"
          active={state.activeTool === 'split'}
          size="sm"
          onClick={handleSplitAtPlayhead}
          disabled={!state.selectedClipId}
        />
        <IconButton
          icon={<Trash2 size={14} />}
          label="Delete Clip (Delete)"
          size="sm"
          onClick={handleDeleteSelected}
          disabled={!state.selectedClipId || state.project.scenes.length <= 1}
        />

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-default)', margin: '0 4px' }} />

        {/* Snapping Toggle */}
        <IconButton
          icon={<Magnet size={14} />}
          label={state.snappingEnabled ? 'Disable Snapping (N)' : 'Enable Snapping (N)'}
          active={state.snappingEnabled}
          size="sm"
          onClick={() => dispatch({ type: 'SET_SNAPPING', enabled: !state.snappingEnabled })}
        />
      </div>

      {/* Right: Zoom Scale & Fit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IconButton
          icon={<ZoomOut size={14} />}
          label="Zoom Out (-)"
          size="sm"
          onClick={() => handleZoom(-20)}
        />

        <div style={{ width: '80px', display: 'flex', alignItems: 'center' }}>
          <input
            type="range"
            min={30}
            max={350}
            step={10}
            value={state.zoomPixelsPerSecond}
            onChange={(e) => dispatch({ type: 'SET_ZOOM', pixelsPerSecond: parseInt(e.target.value) })}
            style={{ width: '100%', height: '4px', accentColor: 'var(--accent)', cursor: 'pointer' }}
            title={`Zoom: ${state.zoomPixelsPerSecond}px/s`}
          />
        </div>

        <IconButton
          icon={<ZoomIn size={14} />}
          label="Zoom In (+)"
          size="sm"
          onClick={() => handleZoom(20)}
        />

        <IconButton
          icon={<Maximize2 size={13} />}
          label="Fit Timeline to View"
          size="sm"
          onClick={handleFitTimeline}
        />
      </div>
    </div>
  );
};
