import React from 'react';
import { CommandBar } from './CommandBar';
import { ResizablePanel } from './ResizablePanel';
import { LeftWorkspace } from './LeftWorkspace';
import { PreviewWorkspace } from '../preview/PreviewWorkspace';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { Timeline } from '../timeline/Timeline';
import { ExportModal } from '../export/ExportModal';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useEditor } from '../../state/editorStore';
import { ChevronUp } from 'lucide-react';

export const EditorShell: React.FC = () => {
  const { state, dispatch } = useEditor();
  // Activate keyboard navigation & shortcuts
  useKeyboardShortcuts();

  const isInspectorOpen = state.isInspectorOpen;
  const isTimelineCollapsed = state.isTimelineCollapsed;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--color-page, #F7F9FC)',
        color: 'var(--color-text-primary, #0F172A)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      data-testid="editor-shell"
    >
      {/* 1. Global Command Bar (50px) */}
      <CommandBar />

      {/* 2. Top Workspaces (Left AI & Assets | Center Preview | Right Inspector) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left: AI Studio & Assets Workspace (Resizable) */}
        <ResizablePanel
          direction="horizontal"
          initialSize={360}
          minSize={280}
          maxSize={480}
          handlePosition="right"
          style={{ borderRight: '1px solid var(--color-border-subtle, #E2E8F0)' }}
        >
          <LeftWorkspace />
        </ResizablePanel>

        {/* Center: Preview Canvas Viewport (Flex Fill) */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
          <PreviewWorkspace />
        </div>

        {/* Right: Context-Sensitive Inspector (Conditional Drawer) */}
        {isInspectorOpen && (
          <ResizablePanel
            direction="horizontal"
            initialSize={300}
            minSize={240}
            maxSize={450}
            handlePosition="left"
            style={{ borderLeft: '1px solid var(--color-border-subtle, #E2E8F0)' }}
          >
            <InspectorPanel />
          </ResizablePanel>
        )}
      </div>

      {/* 3. Bottom Timeline Workspace (Resizable Vertically or Collapsed) */}
      {isTimelineCollapsed ? (
        <div
          style={{
            height: '32px',
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            borderTop: '1px solid var(--color-border-subtle, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            fontSize: '11px',
            color: 'var(--color-text-secondary, #475569)',
            flexShrink: 0,
          }}
        >
          <span>Timeline (Thu gọn)</span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_TIMELINE_COLLAPSED', collapsed: false })}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '4px',
              border: '1px solid var(--color-border-default, #CBD5E1)',
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              color: 'var(--color-brand, #3568E8)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <ChevronUp size={12} />
            Mở rộng Timeline
          </button>
        </div>
      ) : (
        <ResizablePanel
          direction="vertical"
          initialSize={240}
          minSize={160}
          maxSize={450}
          handlePosition="top"
          style={{ borderTop: '1px solid var(--color-border-subtle, #E2E8F0)' }}
        >
          <Timeline />
        </ResizablePanel>
      )}

      {/* 4. Global Modals */}
      <ExportModal />
    </div>
  );
};
