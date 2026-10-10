import React from 'react';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { IconButton, Badge } from '../ui';
import { formatTimecode } from '../../geometry/timecode';

export interface TransportControlsProps {
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
}

export const TransportControls: React.FC<TransportControlsProps> = ({
  playbackRate,
  onPlaybackRateChange,
  volume,
  onVolumeChange,
}) => {
  const { state, dispatch } = useEditor();

  const currentTimecode = formatTimecode(state.currentFrame, state.project.fps);
  const totalTimecode = formatTimecode(state.timeline.totalDurationInFrames, state.project.fps);

  const stepFrame = (delta: number) => {
    dispatch({ type: 'SET_CURRENT_FRAME', frame: state.currentFrame + delta });
  };

  const toggleMute = () => {
    onVolumeChange(volume === 0 ? 1 : 0);
  };

  const nextSpeed = () => {
    const speeds = [0.5, 1, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackRate);
    const nextRate = speeds[(currentIndex + 1) % speeds.length];
    onPlaybackRateChange(nextRate);
  };

  return (
    <div
      style={{
        height: '42px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        borderTop: '1px solid var(--color-border-subtle, #E2E8F0)',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
      data-testid="transport-controls"
    >
      {/* Left: Timecode Readout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '6px',
            fontVariantNumeric: 'tabular-nums',
            fontFamily: '"JetBrains Mono", monospace',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-primary, #17233B)',
              letterSpacing: '0.02em',
            }}
          >
            {currentTimecode}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)' }}>/</span>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary, #52627A)' }}>{totalTimecode}</span>
        </div>

        <Badge variant="default">
          F {state.currentFrame} / {state.timeline.totalDurationInFrames}
        </Badge>
      </div>

      {/* Center: Playback Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <IconButton
          icon={<ChevronsLeft size={14} />}
          label="Lùi 10 frames (Shift+Left)"
          size="sm"
          onClick={() => stepFrame(-10)}
        />
        <IconButton
          icon={<ChevronLeft size={15} />}
          label="Lùi 1 frame (Left)"
          size="sm"
          onClick={() => stepFrame(-1)}
        />

        {/* Primary Play/Pause CTA */}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_PLAYING' })}
          title={state.isPlaying ? 'Tạm dừng (Phím Space)' : 'Phát (Phím Space)'}
          aria-label={state.isPlaying ? 'Tạm dừng' : 'Phát'}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary, #3568E8)',
            color: '#FFFFFF',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            margin: '0 6px',
            boxShadow: '0 2px 6px rgba(53, 104, 232, 0.3)',
            transition: 'transform 80ms ease, background-color 80ms ease',
            outline: 'none',
          }}
          onMouseDown={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.95)')}
          onMouseUp={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
        >
          {state.isPlaying ? <Pause size={15} fill="#FFFFFF" /> : <Play size={15} fill="#FFFFFF" style={{ marginLeft: '2px' }} />}
        </button>

        <IconButton
          icon={<ChevronRight size={15} />}
          label="Tiến 1 frame (Right)"
          size="sm"
          onClick={() => stepFrame(1)}
        />
        <IconButton
          icon={<ChevronsRight size={14} />}
          label="Tiến 10 frames (Shift+Right)"
          size="sm"
          onClick={() => stepFrame(10)}
        />
      </div>

      {/* Right: Rate & Volume Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Speed Toggle */}
        <button
          onClick={nextSpeed}
          title="Tốc độ phát lại"
          style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-control, 8px)',
            backgroundColor: 'var(--color-surface-muted, #F2F5FA)',
            border: '1px solid var(--color-border-subtle, #E2E8F0)',
            color: 'var(--color-text-secondary, #52627A)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            fontVariantNumeric: 'tabular-nums',
            transition: 'all 120ms ease',
          }}
        >
          {playbackRate}x
        </button>

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <IconButton
            icon={volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            label={volume === 0 ? 'Bật âm thanh' : 'Tắt tiếng'}
            size="sm"
            onClick={toggleMute}
          />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            title={`Âm lượng: ${Math.round(volume * 100)}%`}
            style={{
              width: '56px',
              height: '4px',
              accentColor: 'var(--color-primary, #3568E8)',
              cursor: 'pointer',
            }}
            aria-label="Thanh điều chỉnh âm lượng"
          />
        </div>
      </div>
    </div>
  );
};
