import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Volume2, VolumeX } from 'lucide-react';
import { IconButton } from '../ui/IconButton';

export interface TimelineTrackHeaderProps {
  label: string;
  name: string;
  type: 'video' | 'audio';
  height?: number;
  visible?: boolean;
  muted?: boolean;
  locked?: boolean;
  onToggleVisible?: () => void;
  onToggleMuted?: () => void;
  onToggleLocked?: () => void;
}

export const TimelineTrackHeader: React.FC<TimelineTrackHeaderProps> = ({
  label,
  name,
  type,
  height = 52,
  visible = true,
  muted = false,
  locked = false,
  onToggleVisible,
  onToggleMuted,
  onToggleLocked,
}) => {
  return (
    <div
      style={{
        width: '180px',
        height: `${height}px`,
        backgroundColor: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      {/* Track Label & Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 5px',
            borderRadius: '3px',
            backgroundColor: type === 'video' ? 'rgba(91, 140, 255, 0.15)' : 'rgba(53, 199, 138, 0.15)',
            color: type === 'video' ? 'var(--accent)' : 'var(--success)',
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </span>
      </div>

      {/* Control Icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        {type === 'video' ? (
          <IconButton
            icon={visible ? <Eye size={12} /> : <EyeOff size={12} />}
            label={visible ? 'Hide Track' : 'Show Track'}
            size="sm"
            onClick={onToggleVisible}
            style={{ width: '22px', height: '22px', opacity: visible ? 0.7 : 0.4 }}
          />
        ) : (
          <IconButton
            icon={muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            label={muted ? 'Unmute Track' : 'Mute Track'}
            size="sm"
            onClick={onToggleMuted}
            style={{ width: '22px', height: '22px', opacity: muted ? 0.4 : 0.7 }}
          />
        )}

        <IconButton
          icon={locked ? <Lock size={12} /> : <Unlock size={12} />}
          label={locked ? 'Unlock Track' : 'Lock Track'}
          size="sm"
          onClick={onToggleLocked}
          style={{ width: '22px', height: '22px', opacity: locked ? 1 : 0.4 }}
        />
      </div>
    </div>
  );
};
