import React from 'react';

export interface KeyboardShortcutHintProps {
  shortcut: string;
}

export const KeyboardShortcutHint: React.FC<KeyboardShortcutHintProps> = ({ shortcut }) => {
  const parts = shortcut.split('+');

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
      {parts.map((part, index) => (
        <kbd
          key={index}
          style={{
            display: 'inline-block',
            padding: '1px 5px',
            fontSize: '10px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontWeight: 500,
            lineHeight: '14px',
            color: 'var(--color-text-secondary, #52627A)',
            backgroundColor: 'var(--color-surface-muted, #F2F5FA)',
            border: '1px solid var(--color-border-default, #CBD5E1)',
            borderRadius: '4px',
            boxShadow: '0 1px 0 rgba(0, 0, 0, 0.08)',
          }}
        >
          {part.trim()}
        </kbd>
      ))}
    </span>
  );
};
