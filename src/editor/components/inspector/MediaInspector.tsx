import React from 'react';
import { useEditor } from '../../state/editorStore';
import { VideoSceneConfig, ImageSceneConfig } from '../../../domain/video/Scene';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { getMinSceneDuration } from '../../../domain/video/sceneDuration';

export interface MediaInspectorProps {
  scene: VideoSceneConfig | ImageSceneConfig;
}

export const MediaInspector: React.FC<MediaInspectorProps> = ({ scene }) => {
  const { state, dispatch } = useEditor();

  const update = (updates: Partial<VideoSceneConfig | ImageSceneConfig>) => {
    dispatch({ type: 'UPDATE_SCENE', sceneId: scene.id, updates });
  };

  const isVideo = scene.type === 'video';
  const durationSec = (scene.durationInFrames / state.project.fps).toFixed(1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '12px' }}>
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {isVideo ? 'Video Media Inspector' : 'Image Media Inspector'}
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>ID: {scene.id}</p>
      </div>

      {/* Asset Source Path */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          File Source
        </label>
        <Input
          value={scene.src}
          onChange={(e) => update({ src: e.target.value })}
          placeholder="assets/video/..."
        />
      </div>

      {/* Object Fit */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          Scaling / Fit
        </label>
        <Select
          value={scene.objectFit || 'cover'}
          options={[
            { value: 'cover', label: 'Cover (Fill Frame)' },
            { value: 'contain', label: 'Contain (Fit with Bars)' },
            { value: 'fill', label: 'Stretch to Fill' },
          ]}
          onChange={(e) => update({ objectFit: e.target.value as any })}
        />
      </div>

      {/* Duration */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Duration</label>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {scene.durationInFrames} frames ({durationSec}s)
          </span>
        </div>
        <Slider
          min={getMinSceneDuration(state.project, scene.id)}
          max={600}
          step={5}
          value={scene.durationInFrames}
          onChange={(val) => {
            const minDur = getMinSceneDuration(state.project, scene.id);
            update({ durationInFrames: Math.max(minDur, Math.round(val)) });
          }}
        />
      </div>

      {/* Video Specific: Volume & Playback Rate */}
      {isVideo && (
        <>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Volume</label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {Math.round(((scene as VideoSceneConfig).volume ?? 1) * 100)}%
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={(scene as VideoSceneConfig).volume ?? 1}
              onChange={(val) => update({ volume: val })}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              Playback Rate
            </label>
            <Select
              value={(scene as VideoSceneConfig).playbackRate ?? 1}
              options={[
                { value: 0.5, label: '0.5x Slow' },
                { value: 1, label: '1.0x Normal' },
                { value: 1.5, label: '1.5x Fast' },
                { value: 2, label: '2.0x Double' },
              ]}
              onChange={(e) => update({ playbackRate: parseFloat(e.target.value) })}
            />
          </div>
        </>
      )}

      {/* Image Specific: Subtle Zoom Animation */}
      {!isVideo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="zoomAnim"
            checked={!!(scene as ImageSceneConfig).zoomAnimation}
            onChange={(e) => update({ zoomAnimation: e.target.checked })}
            style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
          <label htmlFor="zoomAnim" style={{ fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            Enable Ken Burns slow zoom animation
          </label>
        </div>
      )}
    </div>
  );
};
