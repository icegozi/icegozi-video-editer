import React, { useRef, useEffect } from 'react';
import { Send, Square, CornerDownLeft } from 'lucide-react';
import { IconButton } from '../ui/IconButton';

interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  onCancel?: () => void;
  isRunning: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const PromptComposer: React.FC<PromptComposerProps> = ({
  value,
  onChange,
  onSend,
  onCancel,
  isRunning,
  disabled = false,
  placeholder = 'Nhập yêu cầu tạo hoặc chỉnh sửa video bằng ngôn ngữ tự nhiên…',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea according to scrollHeight (min 40px, max 160px)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(160, Math.max(40, textarea.scrollHeight));
    textarea.style.height = `${newHeight}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Crucial: Guard against IME composition (e.g., Vietnamese Telex, Japanese, Chinese)
    // where Enter is pressed to select a candidate word.
    if (e.nativeEvent.isComposing || e.keyCode === 229) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isRunning && value.trim()) {
        onSend(value.trim());
      }
    }
  };

  const handleButtonClick = () => {
    if (isRunning) {
      onCancel?.();
    } else if (value.trim()) {
      onSend(value.trim());
    }
  };

  const canSubmit = !disabled && (isRunning || value.trim().length > 0);

  return (
    <div
      style={{
        padding: '10px 12px',
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        borderTop: '1px solid var(--color-border-subtle, #E2E8F0)',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
          padding: '6px 8px 6px 12px',
          backgroundColor: 'var(--color-surface-muted, #F8FAFC)',
          border: '1px solid var(--color-border-default, #CBD5E1)',
          borderRadius: '8px',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
        }}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled && !isRunning}
          rows={1}
          maxLength={8000}
          aria-label="Yêu cầu chỉnh sửa video AI"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            resize: 'none',
            backgroundColor: 'transparent',
            color: 'var(--color-text-primary, #0F172A)',
            fontSize: '13px',
            lineHeight: '1.45',
            fontFamily: 'inherit',
            maxHeight: '160px',
            overflowY: 'auto',
            padding: '2px 0',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {isRunning ? (
            <IconButton
              icon={<Square size={13} fill="currentColor" />}
              label="Dừng tác vụ đang chạy"
              style={{ color: 'var(--color-danger, #D92D20)' }}
              size="sm"
              onClick={handleButtonClick}
            />
          ) : (
            <IconButton
              icon={<Send size={13} />}
              label="Gửi yêu cầu (Enter)"
              style={{ color: 'var(--color-primary, #3568E8)' }}
              size="sm"
              disabled={!canSubmit}
              onClick={handleButtonClick}
            />
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '6px',
          fontSize: '11px',
          color: 'var(--color-text-secondary, #52627A)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <CornerDownLeft size={11} /> Enter để gửi · Shift+Enter để xuống dòng
        </span>
        <span>{value.length > 0 ? `${value.length}/8000` : ''}</span>
      </div>
    </div>
  );
};
