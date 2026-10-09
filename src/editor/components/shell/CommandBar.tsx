import React, { useRef } from 'react';
import { Film, Undo2, Redo2, Download, Save, FolderOpen, RotateCcw } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { useProjectPersistence } from '../../hooks/useProjectPersistence';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

export const CommandBar: React.FC<{ onToggleAssistant?: () => void }> = ({ onToggleAssistant }) => {
  const { state, dispatch } = useEditor();
  const { saveNow, exportJson, importJson, resetToDemo } = useProjectPersistence();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canUndo = state.historyPast.length > 0;
  const canRedo = state.historyFuture.length > 0;

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
          <span style={{ fontSize: '10px', color: '#60A5FA', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#60A5FA' }} />
            Saving...
          </span>
        );
      case 'dirty':
        return (
          <span
            onClick={saveNow}
            title="Click to save now (Ctrl+S)"
            style={{ fontSize: '10px', color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FBBF24' }} />
            Unsaved changes
          </span>
        );
      case 'error':
        return (
          <span
            onClick={saveNow}
            title={state.saveError || 'Save failed. Click to retry.'}
            style={{ fontSize: '10px', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
          >
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
            Save error
          </span>
        );
      case 'saved':
      default:
        return (
          <span style={{ fontSize: '10px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
            Saved
          </span>
        );
    }
  };

  return (
    <header
      style={{
        height: '52px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-panel-elevated)',
        borderBottom: '1px solid var(--border-subtle)',
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
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              backgroundColor: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <Film size={14} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            ICEGOZI
          </span>
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-default)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            {state.project.title}
          </span>
          {renderStatusBadge()}
        </div>
      </div>

      {/* Center: Project Management & Presets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <IconButton
          icon={<Save size={13} />}
          label="Save Project (Ctrl+S)"
          size="sm"
          onClick={saveNow}
        />
        <IconButton
          icon={<FolderOpen size={13} />}
          label="Import Project JSON"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        />
        <IconButton
          icon={<Download size={13} />}
          label="Export Project JSON"
          size="sm"
          onClick={exportJson}
        />
        <IconButton
          icon={<RotateCcw size={13} />}
          label="Reset to Demo Project"
          size="sm"
          onClick={resetToDemo}
        />
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Button size="sm" onClick={onToggleAssistant}>Trợ lý AI</Button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <IconButton
            icon={<Undo2 size={14} />}
            label="Undo (Ctrl+Z)"
            disabled={!canUndo}
            onClick={() => dispatch({ type: 'UNDO' })}
            size="sm"
          />
          <IconButton
            icon={<Redo2 size={14} />}
            label="Redo (Ctrl+Shift+Z)"
            disabled={!canRedo}
            onClick={() => dispatch({ type: 'REDO' })}
            size="sm"
          />
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-default)' }} />

        <Button
          variant="primary"
          size="sm"
          icon={<Download size={13} />}
          onClick={() => dispatch({ type: 'SET_EXPORT_MODAL', open: true })}
        >
          Export Video
        </Button>
      </div>
    </header>
  );
};
