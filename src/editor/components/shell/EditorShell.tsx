import React, { useState } from 'react';
import { AssistantPanel } from '../assistant/AssistantPanel';
import { CommandBar } from './CommandBar';
import { ResizablePanel } from './ResizablePanel';
import { AssetPanel } from '../assets/AssetPanel';
import { PreviewWorkspace } from '../preview/PreviewWorkspace';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { Timeline } from '../timeline/Timeline';
import { ExportModal } from '../export/ExportModal';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

export const EditorShell: React.FC = () => {
  const [assistantOpen, setAssistantOpen] = useState(false);
  // Activate keyboard navigation & shortcuts
  useKeyboardShortcuts();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 1. Global Command Bar (52px) */}
      <CommandBar onToggleAssistant={() => setAssistantOpen((open) => !open)} />

      {/* 2. Top Workspaces (Assets | Preview | Inspector) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left: Asset Panel (Resizable) */}
        <ResizablePanel
          direction="horizontal"
          initialSize={280}
          minSize={220}
          maxSize={420}
          handlePosition="right"
          style={{ borderRight: '1px solid var(--border-subtle)' }}
        >
          <AssetPanel />
        </ResizablePanel>

        {/* Center: Preview Canvas Viewport (Flex Fill) */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
          <PreviewWorkspace />
        </div>

        {/* Right: Context-Sensitive Inspector (Resizable) */}
        <ResizablePanel
          direction="horizontal"
          initialSize={320}
          minSize={260}
          maxSize={480}
          handlePosition="left"
          style={{ borderLeft: '1px solid var(--border-subtle)' }}
        >
          <InspectorPanel />
        </ResizablePanel>
      </div>

      {/* 3. Bottom Timeline Workspace (Resizable Vertically) */}
      <ResizablePanel
        direction="vertical"
        initialSize={260}
        minSize={180}
        maxSize={450}
        handlePosition="top"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        <Timeline />
      </ResizablePanel>

      {/* 4. Global Modals */}
      <ExportModal />
      <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
    </div>
  );
};
