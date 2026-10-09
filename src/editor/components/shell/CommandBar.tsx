import React from 'react';
import { Film, Undo2, Redo2, Download, Settings, Search } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';

export const CommandBar: React.FC = () => {
  const { state, dispatch } = useEditor();

  const canUndo = state.historyPast.length > 0;
  const canRedo = state.historyFuture.length > 0;

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
          <span style={{ fontSize: '10px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
            Saved
          </span>
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '28px',
          padding: '0 10px',
          borderRadius: '6px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          fontSize: '11px',
          cursor: 'pointer',
        }}
      >
        <Search size={12} />
        <span>Quick search / commands</span>
        <kbd
          style={{
            fontSize: '9px',
            padding: '1px 4px',
            borderRadius: '3px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
          }}
        >
          Ctrl K
        </kbd>
      </div>

      {/* Right: Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

        <IconButton icon={<Settings size={14} />} label="Project Settings" size="sm" />

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
