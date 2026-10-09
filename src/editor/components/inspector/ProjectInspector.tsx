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
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
          Project Settings
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
          Global composition properties and timeline scale
        </p>
      </div>

      {/* Project Title */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Title
        </label>
        <Input
          value={project.title}
          onChange={(e) =>
            dispatch({
              type: 'UPDATE_PROJECT_METADATA',
              updates: { title: e.target.value },
            })
          }
          placeholder="Project Title"
        />
      </div>

      {/* Resolution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Width (px)
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
          <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Height (px)
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
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Frame Rate (FPS)
        </label>
        <Select
          value={project.fps}
          options={[
            { value: 24, label: '24 FPS (Cinematic)' },
            { value: 25, label: '25 FPS (PAL)' },
            { value: 30, label: '30 FPS (Standard)' },
            { value: 60, label: '60 FPS (Smooth)' },
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
          borderRadius: '6px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '11px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
          <span>Total Duration</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {totalTimecode} ({totalSeconds}s)
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
          <span>Total Frames</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {timeline.totalDurationInFrames} f
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
          <span>Scenes Count</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{project.scenes.length}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
          <span>Audio Tracks</span>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {project.audioTracks?.length || 0}
          </span>
        </div>
      </div>
    </div>
  );
};
