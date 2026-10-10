import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  size = 'md',
  style,
}) => {
  const height = size === 'sm' ? '28px' : '32px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'var(--color-surface-muted, #F2F5FA)',
        border: '1px solid var(--color-border-subtle, #E2E8F0)',
        borderRadius: 'var(--radius-control, 8px)',
        padding: '2px',
        gap: '2px',
        ...style,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height,
              padding: size === 'sm' ? '0 10px' : '0 14px',
              borderRadius: '6px',
              fontSize,
              fontWeight: isActive ? 600 : 500,
              border: 'none',
              backgroundColor: isActive ? 'var(--color-surface, #FFFFFF)' : 'transparent',
              color: isActive ? 'var(--color-primary, #3568E8)' : 'var(--color-text-secondary, #52627A)',
              boxShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none',
              cursor: 'pointer',
              transition: 'all 120ms ease',
              outline: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon && (
              <span
                style={{
                  display: 'inline-flex',
                  color: isActive ? 'var(--color-primary, #3568E8)' : 'currentColor',
                }}
              >
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
