import React from 'react';
import { Sparkles, Film } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { AiChatPanel } from '../chat/AiChatPanel';
import { AssetPanel } from '../assets/AssetPanel';
import { Tabs } from '../ui';

export const LeftWorkspace: React.FC = () => {
  const { state, dispatch } = useEditor();
  const activeTab = state.activeLeftTab || 'ai';

  const workspaceTabs = [
    { id: 'ai', label: 'AI Studio', icon: <Sparkles size={13} /> },
    { id: 'assets', label: 'Assets & Scenes', icon: <Film size={13} /> },
  ];

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
          height: '42px',
          borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)',
          backgroundColor: 'var(--color-surface-muted, #F2F5FA)',
          padding: '0 10px',
          flexShrink: 0,
        }}
      >
        <Tabs
          tabs={workspaceTabs}
          activeTab={activeTab}
          size="sm"
          onChange={(tab) => dispatch({ type: 'SET_ACTIVE_LEFT_TAB', tab: tab as 'ai' | 'assets' })}
        />
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
