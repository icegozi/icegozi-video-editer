import React from 'react';
import { useEditor } from '../../state/editorStore';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { formatTimecode } from '../../geometry/timecode';

export const ProjectInspector: React.FC = () => {
  const { state, dispatch } = useEditor();
  const { project, timeline } = state;

  const totalTimecode = formatTimecode(timeline.totalDurationInFrames, project.fps);
  const totalSeconds = (timeline.totalDurationInFrames / project.fps).toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '12px' }}>
      <div style={{ borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)', paddingBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary, #17233B)' }}>
          Cấu hình Dự án
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)' }}>
          Kích thước video, tỷ lệ khung hình và thông số timeline
        </p>
      </div>

      {/* Project Title */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
          Tên dự án
        </label>
        <Input
          value={project.title}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_PROJECT_METADATA',
              updates: { title: e.target.value },
            })
          }
          placeholder="Nhập tên dự án…"
        />
      </div>

      {/* Resolution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
            Chiều rộng (px)
          </label>
          <Input
            type="number"
            tabular
            value={project.width}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_PROJECT_METADATA',
                updates: { width: Math.max(320, parseInt(e.target.value) || 1920) },
              })
            }
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
            Chiều cao (px)
          </label>
          <Input
            type="number"
            tabular
            value={project.height}
            onChange={(e) =>
              dispatch({
                type: 'UPDATE_PROJECT_METADATA',
                updates: { height: Math.max(240, parseInt(e.target.value) || 1080) },
              })
            }
          />
        </div>
      </div>

      {/* Frame Rate */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
          Tốc độ khung hình (FPS)
        </label>
        <Select
          value={project.fps}
          options={[
            { value: 24, label: '24 FPS (Điện ảnh)' },
            { value: 25, label: '25 FPS (PAL)' },
            { value: 30, label: '30 FPS (Tiêu chuẩn)' },
            { value: 60, label: '60 FPS (Mượt mà)' },
          ]}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_PROJECT_METADATA',
              updates: { fps: parseInt(e.target.value) },
            })
          }
        />
      </div>

      {/* Metadata Readouts */}
      <div
        style={{
          marginTop: '8px',
          padding: '10px',
          borderRadius: 'var(--radius-controlSm, 6px)',
          backgroundColor: 'var(--color-surface-muted, #F2F5FA)',
          border: '1px solid var(--color-border-subtle, #E2E8F0)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary, #52627A)' }}>
          <span>Tổng thời lượng</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary, #17233B)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
            {totalTimecode} ({totalSeconds}s)
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary, #52627A)' }}>
          <span>Tổng số frame</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary, #17233B)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
            {timeline.totalDurationInFrames} f
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary, #52627A)' }}>
          <span>Số lượng scene</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary, #17233B)' }}>{project.scenes.length}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary, #52627A)' }}>
          <span>Track âm thanh</span>
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary, #17233B)' }}>
            {project.audioTracks?.length || 0}
          </span>
        </div>
      </div>
    </div>
  );
};
