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
import { IconButton } from '../ui/IconButton';
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
        backgroundColor: 'var(--bg-panel-elevated)',
        borderTop: '1px solid var(--border-subtle)',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {/* Left: Timecode Readout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '6px',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '0.02em',
            }}
          >
            {currentTimecode}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{totalTimecode}</span>
        </div>

        <span
          style={{
            fontSize: '10px',
            padding: '1px 5px',
            borderRadius: '3px',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          Frame {state.currentFrame} / {state.timeline.totalDurationInFrames}
        </span>
      </div>

      {/* Center: Playback Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <IconButton
          icon={<ChevronsLeft size={14} />}
          label="Step -10 frames (Shift+Left)"
          size="sm"
          onClick={() => stepFrame(-10)}
        />
        <IconButton
          icon={<ChevronLeft size={15} />}
          label="Step -1 frame (Left)"
          size="sm"
          onClick={() => stepFrame(-1)}
        />

        <button
          onClick={() => dispatch({ type: 'TOGGLE_PLAYING' })}
          title={state.isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          aria-label={state.isPlaying ? 'Pause' : 'Play'}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            color: '#FFFFFF',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            margin: '0 4px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
            transition: 'transform 80ms ease, background-color 80ms ease',
          }}
          onMouseDown={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.95)')}
          onMouseUp={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
        >
          {state.isPlaying ? <Pause size={14} fill="#FFFFFF" /> : <Play size={14} fill="#FFFFFF" style={{ marginLeft: '2px' }} />}
        </button>

        <IconButton
          icon={<ChevronRight size={15} />}
          label="Step +1 frame (Right)"
          size="sm"
          onClick={() => stepFrame(1)}
        />
        <IconButton
          icon={<ChevronsRight size={14} />}
          label="Step +10 frames (Shift+Right)"
          size="sm"
          onClick={() => stepFrame(10)}
        />
      </div>

      {/* Right: Rate & Volume Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Speed Toggle */}
        <button
          onClick={nextSpeed}
          title="Playback Speed"
          style={{
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {playbackRate}x
        </button>

        {/* Volume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <IconButton
            icon={volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
            label={volume === 0 ? 'Unmute' : 'Mute'}
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
            title={`Volume: ${Math.round(volume * 100)}%`}
            style={{
              width: '56px',
              height: '4px',
              accentColor: 'var(--accent)',
              cursor: 'pointer',
            }}
          />
        </div>
      </div>
    </div>
  );
};
