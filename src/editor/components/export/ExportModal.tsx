import React, { useState } from 'react';
import { X, Download, Terminal, Check } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { formatTimecode } from '../../geometry/timecode';

export const ExportModal: React.FC = () => {
  const { state, dispatch } = useEditor();
  const [profile, setProfile] = useState<'final' | 'preview'>('final');
  const [copied, setCopied] = useState(false);
  const [renderStatus, setRenderStatus] = useState<'idle' | 'rendering' | 'done'>('idle');

  if (!state.isExportModalOpen) return null;

  const totalTimecode = formatTimecode(state.timeline.totalDurationInFrames, state.project.fps);
  const cliCommand =
    profile === 'final'
      ? 'npm run render'
      : 'npm run render:preview';

  const copyCommand = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startSimulatedRender = () => {
    setRenderStatus('rendering');
    setTimeout(() => {
      setRenderStatus('done');
    }, 2500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={() => dispatch({ type: 'SET_EXPORT_MODAL', open: false })}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '460px',
          backgroundColor: 'var(--bg-panel-elevated)',
          borderRadius: '8px',
          border: '1px solid var(--border-default)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            height: '48px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={16} color="var(--accent)" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Export Video Composition
            </span>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_EXPORT_MODAL', open: false })}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Render Profile
            </label>
            <Select
              value={profile}
              options={[
                { value: 'final', label: 'Production Final (1080p, High Quality, CRF 18)' },
                { value: 'preview', label: 'Fast Draft Preview (720p, CRF 26, Quick Render)' },
              ]}
              onChange={(e) => setProfile(e.target.value as any)}
            />
          </div>

          {/* Details Card */}
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Resolution:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {state.project.width} × {state.project.height}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Frame Rate:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{state.project.fps} FPS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Duration:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                {totalTimecode} ({state.timeline.totalDurationInFrames} frames)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
              <span>Output Path:</span>
              <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>
                output/main_video.mp4
              </span>
            </div>
          </div>

          {/* CLI Command Box */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>CLI Equivalent Command:</span>
              <button
                onClick={copyCommand}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {copied ? <Check size={12} /> : <Terminal size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div
              style={{
                padding: '8px 10px',
                backgroundColor: 'var(--bg-app)',
                borderRadius: '4px',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: '#A5B4FC',
              }}
            >
              {cliCommand}
            </div>
          </div>

          {renderStatus === 'rendering' && (
            <div style={{ padding: '8px', textAlign: 'center', color: 'var(--accent)', fontSize: '12px' }}>
              Rendering composition with Remotion & FFmpeg pipeline...
            </div>
          )}

          {renderStatus === 'done' && (
            <div style={{ padding: '8px', textAlign: 'center', color: 'var(--success)', fontSize: '12px' }}>
              Render complete! Output saved to output/main_video.mp4.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            height: '48px',
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            borderTop: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-panel)',
          }}
        >
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_EXPORT_MODAL', open: false })}>
            Close
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Download size={13} />}
            onClick={startSimulatedRender}
            disabled={renderStatus === 'rendering'}
          >
            {renderStatus === 'rendering' ? 'Rendering...' : 'Render Video'}
          </Button>
        </div>
      </div>
    </div>
  );
};
