import React, { useRef } from 'react';
import { useEditor } from '../../state/editorStore';
import { framesToPixels, pixelsToFrames, findSnapFrame } from '../../geometry/timelineGeometry';

export interface TimelinePlayheadProps {
  timelineHeight: number;
}

export const TimelinePlayhead: React.FC<TimelinePlayheadProps> = ({ timelineHeight }) => {
  const { state, dispatch } = useEditor();
  const playheadRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const { fps } = state.project;
  const pps = state.zoomPixelsPerSecond;
  const totalFrames = state.timeline.totalDurationInFrames;

  const leftPx = framesToPixels(state.currentFrame, fps, pps);

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const parent = playheadRef.current?.parentElement;
    if (!parent) return;

    const parentRect = parent.getBoundingClientRect();
    const currentX = e.clientX - parentRect.left;
    let targetFrame = pixelsToFrames(currentX, fps, pps);

    if (state.snappingEnabled) {
      const snapCandidates = [
        0,
        totalFrames,
        ...state.timeline.computedScenes.map((s) => s.startFrame),
        ...state.timeline.computedScenes.map((s) => s.startFrame + s.durationInFrames),
      ];
      const { snappedFrame } = findSnapFrame(targetFrame, snapCandidates, fps, pps);
      targetFrame = snappedFrame;
    }

    dispatch({ type: 'SET_CURRENT_FRAME', frame: targetFrame });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  return (
    <div
      ref={playheadRef}
      style={{
        position: 'absolute',
        left: `${leftPx}px`,
        top: 0,
        bottom: 0,
        width: '1px',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      {/* 2px Red Playhead Line */}
      <div
        style={{
          position: 'absolute',
          left: '-1px',
          top: '28px', // starts below ruler
          width: '2px',
          height: `${timelineHeight}px`,
          backgroundColor: 'var(--playhead)',
        }}
      />

      {/* Top Handle (Grabber in Ruler) */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'absolute',
          left: '-6px',
          top: 0,
          width: '12px',
          height: '28px',
          cursor: 'ew-resize',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Top Flag */}
        <div
          style={{
            width: '12px',
            height: '16px',
            backgroundColor: 'var(--playhead)',
            borderRadius: '2px 2px 0 0',
          }}
        />
        {/* Downward Caret */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '8px solid var(--playhead)',
          }}
        />
      </div>
    </div>
  );
};
