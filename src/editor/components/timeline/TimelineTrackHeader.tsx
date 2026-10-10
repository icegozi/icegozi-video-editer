import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Volume2, VolumeX } from 'lucide-react';
import { IconButton } from '../ui';

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
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        borderRight: '1px solid var(--color-border-subtle, #E2E8F0)',
        borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)',
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
      data-testid={`track-header-${label.toLowerCase()}`}
    >
      {/* Track Label & Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 'var(--radius-controlSm, 6px)',
            backgroundColor: type === 'video' ? 'var(--color-primary-subtle, #EEF3FF)' : 'var(--color-success-subtle, #ECFDF5)',
            color: type === 'video' ? 'var(--color-primary, #3568E8)' : 'var(--color-success, #167A4A)',
            border: `1px solid ${type === 'video' ? 'rgba(53, 104, 232, 0.2)' : 'rgba(22, 122, 74, 0.2)'}`,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: 'var(--color-text-secondary, #52627A)',
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
            label={visible ? 'Ẩn Track' : 'Hiện Track'}
            size="sm"
            onClick={onToggleVisible}
            style={{ width: '24px', height: '24px', opacity: visible ? 0.8 : 0.4 }}
          />
        ) : (
          <IconButton
            icon={muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            label={muted ? 'Bật âm thanh Track' : 'Tắt tiếng Track'}
            size="sm"
            onClick={onToggleMuted}
            style={{ width: '24px', height: '24px', opacity: muted ? 0.4 : 0.8 }}
          />
        )}

        <IconButton
          icon={locked ? <Lock size={12} /> : <Unlock size={12} />}
          label={locked ? 'Mở khóa Track' : 'Khóa Track'}
          size="sm"
          onClick={onToggleLocked}
          style={{ width: '24px', height: '24px', opacity: locked ? 1 : 0.4 }}
        />
      </div>
    </div>
  );
};
