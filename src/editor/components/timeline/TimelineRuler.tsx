import React, { useRef, useCallback } from 'react';
import { useEditor } from '../../state/editorStore';
import { pixelsToFrames, framesToPixels, findSnapFrame } from '../../geometry/timelineGeometry';
import { formatTimecode } from '../../geometry/timecode';

export interface TimelineRulerProps {
  totalWidthPx: number;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({ totalWidthPx }) => {
  const { state, dispatch } = useEditor();
  const rulerRef = useRef<HTMLDivElement>(null);
  const isScrubbingRef = useRef(false);

  const { fps } = state.project;
  const pps = state.zoomPixelsPerSecond;
  const totalFrames = state.timeline.totalDurationInFrames;

  // Determine tick interval in seconds based on zoom level
  const majorIntervalSec = pps >= 150 ? 1 : pps >= 70 ? 2 : 5;
  const totalSeconds = Math.ceil(totalFrames / fps) + 5; // buffer 5 seconds

  const seekFromPointer = useCallback(
    (e: React.PointerEvent) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      let targetFrame = pixelsToFrames(clickX, fps, pps);

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
    },
    [fps, pps, totalFrames, state.snappingEnabled, state.timeline.computedScenes, dispatch]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    isScrubbingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    seekFromPointer(e);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isScrubbingRef.current) return;
    seekFromPointer(e);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    isScrubbingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  // Render major time ticks
  const ticks = [];
  for (let s = 0; s <= totalSeconds; s += majorIntervalSec) {
    const leftPx = framesToPixels(s * fps, fps, pps);
    if (leftPx > totalWidthPx) break;

    const timeLabel = formatTimecode(s * fps, fps).slice(3); // MM:SS:FF format

    ticks.push(
      <div
        key={s}
        style={{
          position: 'absolute',
          left: `${leftPx}px`,
          top: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontSize: '10px',
            color: 'var(--color-text-secondary, #52627A)',
            paddingLeft: '4px',
            fontFamily: 'var(--font-mono, monospace)',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 500,
          }}
        >
          {timeLabel}
        </span>
        <div style={{ width: '1px', height: '8px', backgroundColor: 'var(--color-border-subtle, #E2E8F0)' }} />
      </div>
    );
  }

  return (
    <div
      ref={rulerRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'relative',
        height: '28px',
        width: `${totalWidthPx}px`,
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)',
        boxSizing: 'border-box',
        cursor: 'ew-resize',
        userSelect: 'none',
      }}
    >
      {ticks}
    </div>
  );
};
