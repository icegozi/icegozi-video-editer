import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Terminal, Check, AlertCircle, Play } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { formatTimecode } from '../../geometry/timecode';

export const ExportModal: React.FC = () => {
  const { state, dispatch } = useEditor();
  const [profile, setProfile] = useState<'final' | 'preview'>('preview');
  const [copied, setCopied] = useState(false);
  const [renderStatus, setRenderStatus] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  if (!state.isExportModalOpen) return null;

  const totalTimecode = formatTimecode(state.timeline.totalDurationInFrames, state.project.fps);
  const cliCommand =
    profile === 'final'
      ? 'npm run render -- --profile=final'
      : 'npm run render:preview -- --profile=preview';

  const copyCommand = () => {
    navigator.clipboard.writeText(cliCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startRender = async () => {
    setRenderStatus('rendering');
    setProgress(5);
    setErrorMessage(null);
    setDownloadUrl(null);
    setOutputPath(null);

    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: state.project,
          profile,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to start render');
      }

      const jobId = data.job.id;
      activeJobIdRef.current = jobId;

      // Start polling status
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/render/status/${jobId}`);
          const statusData = await res.json();
          if (!res.ok || !statusData.success) return;

          const job = statusData.job;
          setProgress(job.progress || 5);

          if (job.status === 'completed') {
            clearInterval(pollTimerRef.current);
            setRenderStatus('done');
            setProgress(100);
            setDownloadUrl(job.downloadUrl);
            setOutputPath(job.outputPath);
          } else if (job.status === 'failed') {
            clearInterval(pollTimerRef.current);
            setRenderStatus('error');
            setErrorMessage(job.error || 'Render failed');
          } else if (job.status === 'cancelled') {
            clearInterval(pollTimerRef.current);
            setRenderStatus('idle');
          }
        } catch {
          // Retry on next interval
        }
      }, 1000);
    } catch (err) {
      setRenderStatus('error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const cancelRender = async () => {
    if (activeJobIdRef.current) {
      try {
        await fetch(`/api/render/cancel/${activeJobIdRef.current}`, { method: 'POST' });
      } catch {
        // Ignore
      }
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
    setRenderStatus('idle');
    setProgress(0);
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
          width: '500px',
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
              disabled={renderStatus === 'rendering'}
              options={[
                { value: 'preview', label: 'Fast Draft Preview (Draft scale 0.5, CRF 26, Quick Render)' },
                { value: 'final', label: 'Production Final (Full 1080p, High Quality, CRF 18)' },
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
              <span>Target Directory:</span>
              <span style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>
                {profile === 'final' ? 'output/' : 'generated/previews/'}
              </span>
            </div>
          </div>

          {/* Progress / Status display */}
          {renderStatus === 'rendering' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--accent)' }}>Rendering with Remotion engine...</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{progress}%</span>
              </div>
              <div
                style={{
                  height: '6px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    backgroundColor: 'var(--accent)',
                    transition: 'width 250ms ease',
                  }}
                />
              </div>
            </div>
          )}

          {renderStatus === 'done' && (
            <div
              style={{
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(53, 199, 138, 0.1)',
                border: '1px solid rgba(53, 199, 138, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '12px', fontWeight: 600 }}>
                <Check size={16} />
                <span>Render completed successfully!</span>
              </div>
              {outputPath && (
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  File: {outputPath}
                </div>
              )}
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--accent)',
                    color: '#FFFFFF',
                    textDecoration: 'none',
                    fontSize: '12px',
                    fontWeight: 500,
                    width: 'fit-content',
                  }}
                >
                  <Download size={13} />
                  Download Exported Video
                </a>
              )}
            </div>
          )}

          {renderStatus === 'error' && (
            <div
              style={{
                padding: '10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#EF4444',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>Render Error:</div>
                <div style={{ wordBreak: 'break-word', fontFamily: 'monospace' }}>{errorMessage}</div>
              </div>
            </div>
          )}

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
          {renderStatus === 'rendering' ? (
            <Button variant="ghost" size="sm" onClick={cancelRender}>
              Cancel Render
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_EXPORT_MODAL', open: false })}>
              Close
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={<Download size={13} />}
            onClick={startRender}
            disabled={renderStatus === 'rendering'}
          >
            {renderStatus === 'rendering' ? 'Rendering...' : 'Render Video'}
          </Button>
        </div>
      </div>
    </div>
  );
};
