import React from 'react';
import { CommandBar } from './CommandBar';
import { ResizablePanel } from './ResizablePanel';
import { LeftWorkspace } from './LeftWorkspace';
import { PreviewWorkspace } from '../preview/PreviewWorkspace';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { Timeline } from '../timeline/Timeline';
import { ExportModal } from '../export/ExportModal';
import { ToastProvider, Button } from '../ui';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useEditor } from '../../state/editorStore';
import { ChevronUp, EyeOff } from 'lucide-react';

const EditorShellInner: React.FC = () => {
  const { state, dispatch } = useEditor();
  useKeyboardShortcuts();

  const isInspectorOpen = state.isInspectorOpen;
  const isTimelineCollapsed = state.isTimelineCollapsed;
  const mode = state.workspaceMode || 'ai';

  // Adaptive panel dimensions per mode
  const isPreviewMode = mode === 'preview';
  const timelineInitialHeight = mode === 'ai' ? 110 : 260;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--color-app-bg, #F7F9FC)',
        color: 'var(--color-text-primary, #17233B)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
      data-testid="editor-shell"
    >
      {/* 1. Global Command Bar (48px) */}
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
        {/* Left: AI Studio & Assets Workspace (Hidden in Preview Focus, Resizable in AI and Edit) */}
        {!isPreviewMode && (
          <ResizablePanel
            direction="horizontal"
            initialSize={380}
            minSize={280}
            maxSize={480}
            handlePosition="right"
            style={{ borderRight: '1px solid var(--color-border-subtle, #E2E8F0)' }}
          >
            <LeftWorkspace />
          </ResizablePanel>
        )}

        {/* Center: Preview Canvas Viewport (Flex Fill) */}
        <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
          <PreviewWorkspace />
        </div>

        {/* Right: Context-Sensitive Inspector (Conditional Drawer, disabled in Preview Mode) */}
        {isInspectorOpen && !isPreviewMode && (
          <ResizablePanel
            direction="horizontal"
            initialSize={320}
            minSize={260}
            maxSize={460}
            handlePosition="left"
            style={{ borderLeft: '1px solid var(--color-border-subtle, #E2E8F0)' }}
          >
            <InspectorPanel />
          </ResizablePanel>
        )}
      </div>

      {/* 3. Bottom Timeline Workspace */}
      {isTimelineCollapsed ? (
        <div
          style={{
            height: '36px',
            backgroundColor: 'var(--color-surface, #FFFFFF)',
            borderTop: '1px solid var(--color-border-subtle, #E2E8F0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 16px',
            fontSize: '12px',
            color: 'var(--color-text-secondary, #52627A)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Timeline (Thu gọn)</span>
            {isPreviewMode && (
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted, #64748B)' }}>
                • Đang ở chế độ xem trước toàn màn hình
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isPreviewMode && (
              <Button
                variant="ghost"
                size="sm"
                icon={<EyeOff size={13} />}
                onClick={() => dispatch({ type: 'SET_WORKSPACE_MODE', mode: 'ai' })}
              >
                Thoát Preview Focus
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<ChevronUp size={13} />}
              onClick={() => dispatch({ type: 'SET_TIMELINE_COLLAPSED', collapsed: false })}
            >
              Mở rộng Timeline
            </Button>
          </div>
        </div>
      ) : (
        <ResizablePanel
          direction="vertical"
          initialSize={timelineInitialHeight}
          minSize={mode === 'ai' ? 80 : 160}
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

export const EditorShell: React.FC = () => {
  return (
    <ToastProvider>
      <EditorShellInner />
    </ToastProvider>
  );
};
