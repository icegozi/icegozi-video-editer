import React, { useRef } from 'react';
import {
  Sparkles,
  Edit3,
  Eye,
  Undo2,
  Redo2,
  Download,
  Save,
  FolderOpen,
  Sliders,
  Film,
} from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { useProjectPersistence } from '../../hooks/useProjectPersistence';
import { Button, IconButton, Tabs, Badge } from '../ui';

export const CommandBar: React.FC = () => {
  const { state, dispatch } = useEditor();
  const { saveNow, exportJson, importJson } = useProjectPersistence();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUndo = state.historyPast.length > 0;
  const canRedo = state.historyFuture.length > 0;
  const currentMode = state.workspaceMode || 'ai';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        importJson(content);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const renderStatusBadge = () => {
    switch (state.saveStatus) {
      case 'saving':
        return (
          <Badge variant="brand">
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-primary, #3568E8)' }} />
            Đang lưu…
          </Badge>
        );
      case 'dirty':
        return (
          <Badge variant="warning" onClick={saveNow}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-warning, #B45309)' }} />
            Chưa lưu (Ctrl+S)
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="danger" onClick={saveNow}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-danger, #DC2626)' }} />
            Lỗi lưu
          </Badge>
        );
      case 'saved':
      default:
        return (
          <Badge variant="success">
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success, #167A4A)' }} />
            Đã lưu
          </Badge>
        );
    }
  };

  const modeTabs = [
    { id: 'ai', label: 'AI Focus', icon: <Sparkles size={13} /> },
    { id: 'edit', label: 'Edit Focus', icon: <Edit3 size={13} /> },
    { id: 'preview', label: 'Preview Focus', icon: <Eye size={13} /> },
  ];

  return (
    <header
      style={{
        height: '48px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)',
        boxSizing: 'border-box',
        flexShrink: 0,
        zIndex: 50,
      }}
      data-testid="command-bar"
    >
      {/* Hidden file input for project JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Left: Studio Identity & Project Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-control, 8px)',
              backgroundColor: 'var(--color-primary, #3568E8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(53, 104, 232, 0.3)',
            }}
          >
            <Film size={15} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary, #17233B)', letterSpacing: '-0.02em', lineHeight: '16px' }}>
              ICEGOZI
            </span>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted, #64748B)', lineHeight: '12px' }}>
              Studio
            </span>
          </div>
        </div>

        <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--color-border-subtle, #E2E8F0)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary, #17233B)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {state.project.title}
          </span>
          {renderStatusBadge()}
        </div>
      </div>

      {/* Center: Workspace Mode Switcher via unified Tabs primitive */}
      <Tabs
        tabs={modeTabs}
        activeTab={currentMode}
        size="sm"
        onChange={(mode) => dispatch({ type: 'SET_WORKSPACE_MODE', mode: mode as 'ai' | 'edit' | 'preview' })}
      />

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Project Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <IconButton
            icon={<Save size={14} />}
            label="Lưu dự án (Ctrl+S)"
            size="sm"
            onClick={saveNow}
          />
          <IconButton
            icon={<FolderOpen size={14} />}
            label="Mở tệp JSON dự án"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          />
          <IconButton
            icon={<Download size={14} />}
            label="Tải xuống tệp JSON dự án"
            size="sm"
            onClick={exportJson}
          />
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--color-border-subtle, #E2E8F0)' }} />

        {/* History Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <IconButton
            icon={<Undo2 size={14} />}
            label="Hoàn tác (Ctrl+Z)"
            size="sm"
            disabled={!canUndo}
            onClick={() => dispatch({ type: 'UNDO' })}
          />
          <IconButton
            icon={<Redo2 size={14} />}
            label="Làm lại (Ctrl+Y)"
            size="sm"
            disabled={!canRedo}
            onClick={() => dispatch({ type: 'REDO' })}
          />
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--color-border-subtle, #E2E8F0)' }} />

        {/* Inspector Toggle */}
        <IconButton
          icon={<Sliders size={14} />}
          label="Thuộc tính Inspector"
          size="sm"
          active={state.isInspectorOpen}
          onClick={() => dispatch({ type: 'TOGGLE_INSPECTOR' })}
        />

        {/* Major Action: Export Modal */}
        <Button
          variant="primary"
          size="sm"
          icon={<Download size={13} />}
          onClick={() => dispatch({ type: 'SET_EXPORT_MODAL', open: true })}
        >
          Xuất video
        </Button>
      </div>
    </header>
  );
};
