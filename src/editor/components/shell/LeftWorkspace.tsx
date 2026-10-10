import React from 'react';
import { Sparkles, Film, Plus } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { AiChatPanel } from '../chat/AiChatPanel';
import { AssetPanel } from '../assets/AssetPanel';

export const LeftWorkspace: React.FC = () => {
  const { state, dispatch } = useEditor();
  const activeTab = state.activeLeftTab || 'ai';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      data-testid="left-workspace"
    >
      {/* Workspace Tabs Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '38px',
          borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)',
          backgroundColor: 'var(--color-surface-muted, #F8FAFC)',
          padding: '0 8px',
          gap: '4px',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_ACTIVE_LEFT_TAB', tab: 'ai' })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '28px',
            padding: '0 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: activeTab === 'ai' ? 600 : 500,
            border: activeTab === 'ai' ? '1px solid var(--color-border-default, #CBD5E1)' : '1px solid transparent',
            backgroundColor: activeTab === 'ai' ? 'var(--color-surface, #FFFFFF)' : 'transparent',
            color: activeTab === 'ai' ? 'var(--color-brand, #3568E8)' : 'var(--color-text-secondary, #475569)',
            cursor: 'pointer',
            transition: 'all 120ms ease',
          }}
          aria-selected={activeTab === 'ai'}
        >
          <Sparkles size={13} color={activeTab === 'ai' ? 'var(--color-brand, #3568E8)' : 'currentColor'} />
          <span>AI Studio</span>
        </button>

        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_ACTIVE_LEFT_TAB', tab: 'assets' })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '28px',
            padding: '0 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: activeTab === 'assets' ? 600 : 500,
            border: activeTab === 'assets' ? '1px solid var(--color-border-default, #CBD5E1)' : '1px solid transparent',
            backgroundColor: activeTab === 'assets' ? 'var(--color-surface, #FFFFFF)' : 'transparent',
            color: activeTab === 'assets' ? 'var(--color-brand, #3568E8)' : 'var(--color-text-secondary, #475569)',
            cursor: 'pointer',
            transition: 'all 120ms ease',
          }}
          aria-selected={activeTab === 'assets'}
        >
          <Film size={13} />
          <span>Assets & Scenes</span>
        </button>
      </div>

      {/* Tab Content Viewport */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div style={{ height: '100%', display: activeTab === 'ai' ? 'block' : 'none' }}>
          <AiChatPanel />
        </div>
        {activeTab !== 'ai' && <AssetPanel />}
      </div>
    </div>
  );
};
