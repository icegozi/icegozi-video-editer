import React, { useRef } from 'react';
import {
  Film,
  Undo2,
  Redo2,
  Download,
  Save,
  FolderOpen,
  RotateCcw,
  Sliders,
  Sparkles,
  Edit3,
  Eye,
} from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { useProjectPersistence } from '../../hooks/useProjectPersistence';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

export const CommandBar: React.FC = () => {
  const { state, dispatch } = useEditor();
  const { saveNow, exportJson, importJson, resetToDemo } = useProjectPersistence();
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
    e.target.value = ''; // Reset input
  };

  const renderStatusBadge = () => {
    switch (state.saveStatus) {
      case 'saving':
        return (
          <span style={{ fontSize: '11px', color: 'var(--color-brand, #3568E8)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-brand, #3568E8)' }} />
            Đang lưu…
          </span>
        );
      case 'dirty':
        return (
          <span
            onClick={saveNow}
            title="Nhấn để lưu ngay (Ctrl+S)"
            style={{ fontSize: '11px', color: 'var(--color-warning, #B45309)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-warning, #B45309)' }} />
            Chưa lưu
          </span>
        );
      case 'error':
        return (
          <span
            onClick={saveNow}
            title={state.saveError || 'Lưu thất bại. Bấm để thử lại.'}
            style={{ fontSize: '11px', color: 'var(--color-danger, #DC2626)', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-danger, #DC2626)' }} />
            Lỗi lưu
          </span>
        );
      case 'saved':
      default:
        return (
          <span style={{ fontSize: '11px', color: 'var(--color-success, #167A4A)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success, #167A4A)' }} />
            Đã lưu
          </span>
        );
    }
  };

  return (
    <header
      style={{
        height: '50px',
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
    >
      {/* Hidden file input for project JSON import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Left: Identity & Project Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-brand, #3568E8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <Film size={15} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary, #0F172A)', letterSpacing: '-0.02em' }}>
            ICEGOZI
          </span>
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--color-border-subtle, #E2E8F0)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary, #475569)' }}>
            {state.project.title}
          </span>
          {renderStatusBadge()}
        </div>
      </div>

      {/* Center: Workspace Mode Switcher (AI Focus | Edit Focus | Preview Focus) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--color-surface-muted, #F8FAFC)',
          border: '1px solid var(--color-border-default, #CBD5E1)',
          borderRadius: '6px',
          padding: '2px',
          gap: '2px',
        }}
        role="group"
        aria-label="Chế độ làm việc"
      >
        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_WORKSPACE_MODE', mode: 'ai' })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            height: '26px',
            padding: '0 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: currentMode === 'ai' ? 600 : 500,
            border: 'none',
            backgroundColor: currentMode === 'ai' ? 'var(--color-surface, #FFFFFF)' : 'transparent',
            color: currentMode === 'ai' ? 'var(--color-brand, #3568E8)' : 'var(--color-text-secondary, #475569)',
            boxShadow: currentMode === 'ai' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all 120ms ease',
          }}
        >
          <Sparkles size={12} />
          <span>AI Focus</span>
        </button>

        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_WORKSPACE_MODE', mode: 'edit' })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            height: '26px',
            padding: '0 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: currentMode === 'edit' ? 600 : 500,
            border: 'none',
            backgroundColor: currentMode === 'edit' ? 'var(--color-surface, #FFFFFF)' : 'transparent',
            color: currentMode === 'edit' ? 'var(--color-brand, #3568E8)' : 'var(--color-text-secondary, #475569)',
            boxShadow: currentMode === 'edit' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all 120ms ease',
          }}
        >
          <Edit3 size={12} />
          <span>Edit Focus</span>
        </button>

        <button
          type="button"
          onClick={() => dispatch({ type: 'SET_WORKSPACE_MODE', mode: 'preview' })}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            height: '26px',
            padding: '0 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: currentMode === 'preview' ? 600 : 500,
            border: 'none',
            backgroundColor: currentMode === 'preview' ? 'var(--color-surface, #FFFFFF)' : 'transparent',
            color: currentMode === 'preview' ? 'var(--color-brand, #3568E8)' : 'var(--color-text-secondary, #475569)',
            boxShadow: currentMode === 'preview' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all 120ms ease',
          }}
        >
          <Eye size={12} />
          <span>Preview Focus</span>
        </button>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* Project Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <IconButton
            icon={<Save size={13} />}
            label="Lưu dự án (Ctrl+S)"
            size="sm"
            onClick={saveNow}
          />
          <IconButton
            icon={<FolderOpen size={13} />}
            label="Nhập dự án từ file JSON"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          />
          <IconButton
            icon={<Download size={13} />}
            label="Xuất dự án ra file JSON"
            size="sm"
            onClick={exportJson}
          />
          <IconButton
            icon={<RotateCcw size={13} />}
            label="Đặt lại về dự án mẫu"
            size="sm"
            onClick={resetToDemo}
          />
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--color-border-subtle, #E2E8F0)' }} />

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <IconButton
            icon={<Undo2 size={13} />}
            label="Hoàn tác (Ctrl+Z)"
            disabled={!canUndo}
            onClick={() => dispatch({ type: 'UNDO' })}
            size="sm"
          />
          <IconButton
            icon={<Redo2 size={13} />}
            label="Làm lại (Ctrl+Shift+Z)"
            disabled={!canRedo}
            onClick={() => dispatch({ type: 'REDO' })}
            size="sm"
          />
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--color-border-subtle, #E2E8F0)' }} />

        {/* Toggle Inspector */}
        <IconButton
          icon={<Sliders size={13} />}
          label={state.isInspectorOpen ? 'Ẩn thanh thuộc tính' : 'Hiện thanh thuộc tính'}
          active={state.isInspectorOpen}
          onClick={() => dispatch({ type: 'TOGGLE_INSPECTOR' })}
          size="sm"
        />

        {/* Primary CTA: Export Video */}
        <Button
          variant="primary"
          size="sm"
          icon={<Download size={13} />}
          onClick={() => dispatch({ type: 'SET_EXPORT_MODAL', open: true })}
        >
          Xuất Video
        </Button>
      </div>
    </header>
  );
};
