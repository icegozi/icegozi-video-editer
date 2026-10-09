import React from 'react';

export interface PanelHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ title, actions }) => {
  return (
    <div
      style={{
        height: '36px',
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-panel)',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </span>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{actions}</div>}
    </div>
  );
};
