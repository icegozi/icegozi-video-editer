import React, { useRef, useState } from 'react';
import { Sigma, Type, Video, Image, Music } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { framesToPixels, pixelsToFrames } from '../../geometry/timelineGeometry';
import { COLOR_TOKENS } from '../../tokens/colors';
import { SceneConfig } from '../../../domain/video/Scene';
import { getMinSceneDuration } from '../../../domain/video/sceneDuration';

export interface TimelineClipProps {
  scene: SceneConfig;
  startFrame: number;
  durationInFrames: number;
}

export const TimelineClip: React.FC<TimelineClipProps> = ({
  scene,
  startFrame,
  durationInFrames,
}) => {
  const { state, dispatch } = useEditor();
  const { fps } = state.project;
  const pps = state.zoomPixelsPerSecond;

  const isSelected = state.selectedClipId === scene.id;
  const [isTrimmingRight, setIsTrimmingRight] = useState(false);
  const [trimPreviewDuration, setTrimPreviewDuration] = useState<number | null>(null);

  const trimStartXRef = useRef(0);
  const startDurationRef = useRef(durationInFrames);

  const leftPx = framesToPixels(startFrame, fps, pps);
  const displayDuration = trimPreviewDuration ?? durationInFrames;
  const widthPx = Math.max(24, framesToPixels(displayDuration, fps, pps));

  const getMediaStyle = () => {
    switch (scene.type) {
      case 'formula':
        return COLOR_TOKENS.tracks.formula;
      case 'text':
        return COLOR_TOKENS.tracks.text;
      case 'video':
        return COLOR_TOKENS.tracks.video;
      case 'image':
        return COLOR_TOKENS.tracks.image;
      default:
        return COLOR_TOKENS.tracks.video;
    }
  };

  const getIcon = () => {
    switch (scene.type) {
      case 'formula':
        return <Sigma size={12} />;
      case 'text':
        return <Type size={12} />;
      case 'video':
        return <Video size={12} />;
      case 'image':
        return <Image size={12} />;
      default:
        return <Type size={12} />;
    }
  };

  const getTitle = () => {
    if (scene.type === 'text') return scene.title || 'Text';
    if (scene.type === 'formula') return scene.title || scene.latex || 'Formula';
    if (scene.type === 'video' || scene.type === 'image') return scene.src.split('/').pop() || scene.id;
    return scene.id;
  };

  const mediaStyle = getMediaStyle();

  // Right Edge Trim Handling
  const onTrimPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsTrimmingRight(true);
    trimStartXRef.current = e.clientX;
    startDurationRef.current = durationInFrames;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onTrimPointerMove = (e: React.PointerEvent) => {
    if (!isTrimmingRight) return;
    const deltaX = e.clientX - trimStartXRef.current;
    const deltaFrames = pixelsToFrames(deltaX, fps, pps);
    const minDuration = getMinSceneDuration(state.project, scene.id);
    const newDuration = Math.max(minDuration, startDurationRef.current + deltaFrames);
    setTrimPreviewDuration(newDuration);
  };

  const onTrimPointerUp = (e: React.PointerEvent) => {
    if (!isTrimmingRight) return;
    setIsTrimmingRight(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }

    if (trimPreviewDuration !== null && trimPreviewDuration !== durationInFrames) {
      dispatch({
        type: 'UPDATE_SCENE',
        sceneId: scene.id,
        updates: { durationInFrames: trimPreviewDuration },
      });
    }
    setTrimPreviewDuration(null);
  };

  const durationSec = (displayDuration / fps).toFixed(1);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: 'SET_SELECTED_CLIP', clipId: scene.id });
      }}
      style={{
        position: 'absolute',
        left: `${leftPx}px`,
        width: `${widthPx}px`,
        top: '6px',
        bottom: '6px',
        borderRadius: '4px',
        backgroundColor: mediaStyle.bg,
        border: isSelected ? '2px solid var(--accent)' : `1px solid ${mediaStyle.border}`,
        boxShadow: isSelected ? '0 0 10px rgba(91, 140, 255, 0.35)' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 8px',
        boxSizing: 'border-box',
        cursor: 'pointer',
        overflow: 'hidden',
        userSelect: 'none',
        zIndex: isSelected ? 10 : 2,
        transition: isTrimmingRight ? 'none' : 'border-color 100ms ease, box-shadow 100ms ease',
      }}
    >
      {/* Clip Content & Label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          minWidth: 0,
          pointerEvents: 'none',
        }}
      >
        <span style={{ color: mediaStyle.text, display: 'inline-flex', flexShrink: 0 }}>
          {getIcon()}
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#FFFFFF',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {getTitle()}
        </span>
        <span
          style={{
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontVariantNumeric: 'tabular-nums',
            flexShrink: 0,
          }}
        >
          {durationSec}s
        </span>
      </div>

      {/* Right Trim Handle */}
      <div
        onPointerDown={onTrimPointerDown}
        onPointerMove={onTrimPointerMove}
        onPointerUp={onTrimPointerUp}
        title="Trim End of Clip"
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '8px',
          cursor: 'ew-resize',
          backgroundColor: isTrimmingRight ? 'var(--accent)' : 'rgba(255, 255, 255, 0.08)',
          transition: 'background-color 100ms ease',
        }}
      />

      {/* Trimming Live Tooltip */}
      {isTrimmingRight && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: '4px',
            backgroundColor: 'var(--bg-panel-elevated)',
            border: '1px solid var(--accent)',
            color: '#FFFFFF',
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '10px',
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
          }}
        >
          {durationSec}s ({displayDuration} frames)
        </div>
      )}
    </div>
  );
};
