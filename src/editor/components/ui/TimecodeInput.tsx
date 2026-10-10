import React, { useState, useEffect } from 'react';

export interface TimecodeInputProps {
  frame: number;
  fps?: number;
  maxFrame?: number;
  onChange: (frame: number) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const formatFrameToTimecode = (frame: number, fps: number = 30): string => {
  const safeFrame = Math.max(0, Math.floor(frame));
  const totalSeconds = Math.floor(safeFrame / fps);
  const framesRemaining = safeFrame % fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const ff = String(framesRemaining).padStart(2, '0');

  return `${mm}:${ss}:${ff}`;
};

export const parseTimecodeToFrame = (timecode: string, fps: number = 30): number | null => {
  const parts = timecode.trim().split(':');
  if (parts.length === 3) {
    const [m, s, f] = parts.map(Number);
    if (!isNaN(m) && !isNaN(s) && !isNaN(f)) {
      return m * 60 * fps + s * fps + f;
    }
  }
  const numeric = parseInt(timecode, 10);
  return isNaN(numeric) ? null : numeric;
};

export const TimecodeInput: React.FC<TimecodeInputProps> = ({
  frame,
  fps = 30,
  maxFrame,
  onChange,
  disabled = false,
  style,
}) => {
  const [text, setText] = useState(() => formatFrameToTimecode(frame, fps));

  useEffect(() => {
    setText(formatFrameToTimecode(frame, fps));
  }, [frame, fps]);

  const handleBlur = () => {
    const parsed = parseTimecodeToFrame(text, fps);
    if (parsed !== null) {
      let clamped = Math.max(0, parsed);
      if (typeof maxFrame === 'number') clamped = Math.min(maxFrame, clamped);
      onChange(clamped);
      setText(formatFrameToTimecode(clamped, fps));
    } else {
      setText(formatFrameToTimecode(frame, fps));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={text}
      disabled={disabled}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      style={{
        height: '28px',
        width: '74px',
        textAlign: 'center',
        padding: '0 4px',
        borderRadius: '6px',
        border: '1px solid var(--color-border-default, #CBD5E1)',
        backgroundColor: disabled ? 'var(--color-surface-muted, #F2F5FA)' : 'var(--color-surface, #FFFFFF)',
        color: 'var(--color-text-primary, #17233B)',
        fontSize: '12px',
        fontFamily: '"JetBrains Mono", Menlo, Consolas, monospace',
        fontVariantNumeric: 'tabular-nums',
        boxSizing: 'border-box',
        outline: 'none',
        ...style,
      }}
      aria-label="Thời điểm phát (MM:SS:FF)"
    />
  );
};
