import React, { useState, useEffect, useRef } from 'react';
import { Download, Terminal, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { Button, IconButton, Select, Progress, Dialog } from '../ui';
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
  const renderGenerationRef = useRef(0);
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      renderGenerationRef.current++;
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
    const generation = ++renderGenerationRef.current;
    activeJobIdRef.current = null;
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

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
      if (generation !== renderGenerationRef.current) {
        await fetch(`/api/render/cancel/${jobId}`, { method: 'POST' }).catch(() => {});
        return;
      }
      activeJobIdRef.current = jobId;

      // Start polling status
      pollTimerRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/render/status/${jobId}`);
          const statusData = await res.json();
          if (generation !== renderGenerationRef.current) return;
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
      if (generation !== renderGenerationRef.current) return;
      setRenderStatus('error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  const cancelRender = async () => {
    const generation = ++renderGenerationRef.current;
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
    const currentJobId = activeJobIdRef.current;
    activeJobIdRef.current = null;
    setRenderStatus('idle');
    setProgress(0);

    if (currentJobId) {
      try {
        await fetch(`/api/render/cancel/${currentJobId}`, { method: 'POST' });
      } catch {
        // Ignore
      }
    }
  };

  const handleClose = () => {
    if (renderStatus === 'rendering') {
      cancelRender();
    }
    dispatch({ type: 'SET_EXPORT_MODAL', open: false });
  };

  return (
    <Dialog
      isOpen={state.isExportModalOpen}
      onClose={handleClose}
      title="Xuất video thành phẩm (Export Video)"
      description="Kết xuất video chất lượng cao từ dự án dòng thời gian với engine Remotion"
      width={520}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Render Profile Selection */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-text-secondary, #52627A)',
              marginBottom: '6px',
            }}
          >
            Cấu hình xuất (Render Profile)
          </label>
          <Select
            value={profile}
            disabled={renderStatus === 'rendering'}
            options={[
              { value: 'preview', label: 'Bản xem thử nhanh (Draft 0.5x, CRF 26, tốc độ cao)' },
              { value: 'final', label: 'Bản thành phẩm hoàn chỉnh (Full 1080p, CRF 18, chất lượng tối đa)' },
            ]}
            onChange={(e) => setProfile(e.target.value as any)}
          />
        </div>

        {/* Project Parameters Card */}
        <div
          style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-control, 8px)',
            backgroundColor: 'var(--color-surface-subtle, #F8FAFC)',
            border: '1px solid var(--color-border-subtle, #E2E8F0)',
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary, #52627A)' }}>
            <span>Độ phân giải:</span>
            <span style={{ color: 'var(--color-text-primary, #17233B)', fontWeight: 600 }}>
              {state.project.width} × {state.project.height}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary, #52627A)' }}>
            <span>Tốc độ khung hình:</span>
            <span style={{ color: 'var(--color-text-primary, #17233B)', fontWeight: 600 }}>
              {state.project.fps} FPS
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary, #52627A)' }}>
            <span>Tổng thời lượng:</span>
            <span className="tabular-nums" style={{ color: 'var(--color-text-primary, #17233B)', fontWeight: 600 }}>
              {totalTimecode} ({state.timeline.totalDurationInFrames} frames)
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary, #52627A)' }}>
            <span>Thư mục kết xuất:</span>
            <span style={{ color: 'var(--color-primary, #3568E8)', fontFamily: 'monospace', fontWeight: 600 }}>
              {profile === 'final' ? 'output/' : 'generated/previews/'}
            </span>
          </div>
        </div>

        {/* Progress / Status Display */}
        {renderStatus === 'rendering' && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-control, 8px)',
              backgroundColor: 'var(--color-surface-muted, #F2F5FA)',
              border: '1px solid var(--color-border-subtle, #E2E8F0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <Progress
              value={progress}
              label="Đang kết xuất khung hình qua Remotion..."
              showPercent
            />
          </div>
        )}

        {/* Done State */}
        {renderStatus === 'done' && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-control, 8px)',
              backgroundColor: 'rgba(22, 163, 74, 0.08)',
              border: '1px solid rgba(22, 163, 74, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-success, #16A34A)', fontSize: '13px', fontWeight: 600 }}>
              <Check size={16} />
              <span>Kết xuất video hoàn tất thành công!</span>
            </div>
            {outputPath && (
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                Đường dẫn tệp: {outputPath}
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
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-control, 8px)',
                  backgroundColor: 'var(--color-primary, #3568E8)',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  width: 'fit-content',
                  boxShadow: '0 1px 3px rgba(53, 104, 232, 0.3)',
                }}
              >
                <Download size={14} />
                Tải xuống video
              </a>
            )}
          </div>
        )}

        {/* Error State */}
        {renderStatus === 'error' && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-control, 8px)',
              backgroundColor: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              color: 'var(--color-danger, #DC2626)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: '2px' }}>Lỗi kết xuất video:</div>
              <div style={{ wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '11px' }}>{errorMessage}</div>
            </div>
          </div>
        )}

        {/* CLI Command Equivalent Box */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)' }}>
              Lệnh CLI tương đương (Chạy độc lập):
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={copied ? <Check size={12} color="var(--color-success, #16A34A)" /> : <Terminal size={12} />}
              onClick={copyCommand}
              style={{ fontSize: '11px', height: '24px', padding: '0 6px' }}
            >
              {copied ? 'Đã sao chép' : 'Sao chép lệnh'}
            </Button>
          </div>
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--color-surface-subtle, #F8FAFC)',
              borderRadius: 'var(--radius-control, 8px)',
              border: '1px solid var(--color-border-subtle, #E2E8F0)',
              fontFamily: 'monospace',
              fontSize: '11px',
              color: 'var(--color-primary-dark, #204CB8)',
              overflowX: 'auto',
            }}
          >
            {cliCommand}
          </div>
        </div>

        {/* Dialog Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '8px',
            paddingTop: '8px',
            borderTop: '1px solid var(--color-border-subtle, #E2E8F0)',
          }}
        >
          {renderStatus === 'rendering' ? (
            <Button variant="danger" size="sm" onClick={cancelRender}>
              Hủy kết xuất
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Đóng
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={<Download size={13} />}
            onClick={startRender}
            disabled={renderStatus === 'rendering'}
            loading={renderStatus === 'rendering'}
          >
            {renderStatus === 'rendering' ? 'Đang kết xuất...' : 'Bắt đầu xuất video'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
