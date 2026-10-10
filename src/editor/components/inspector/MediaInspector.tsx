import React from 'react';
import { useEditor } from '../../state/editorStore';
import { VideoSceneConfig, ImageSceneConfig } from '../../../domain/video/Scene';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Slider } from '../ui/Slider';
import { Checkbox } from '../ui/Checkbox';
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
      <div style={{ borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)', paddingBottom: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary, #17233B)' }}>
          {isVideo ? 'Thuộc tính Scene Video' : 'Thuộc tính Scene Hình ảnh'}
        </h4>
        <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)' }}>ID: {scene.id}</p>
      </div>

      {/* Asset Source Path */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
          Đường dẫn tệp nguồn
        </label>
        <Input
          value={scene.src}
          onChange={(e) => update({ src: e.target.value })}
          placeholder="assets/video/…"
        />
      </div>

      {/* Object Fit */}
      <div>
        <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
          Tỷ lệ hiển thị (Scaling)
        </label>
        <Select
          value={scene.objectFit || 'cover'}
          options={[
            { value: 'cover', label: 'Bao phủ (Cover - Lấp đầy khung)' },
            { value: 'contain', label: 'Vừa vặn (Contain - Giữ nguyên tỷ lệ)' },
            { value: 'fill', label: 'Kéo giãn (Fill - Khớp khung hình)' },
          ]}
          onChange={(e) => update({ objectFit: e.target.value as any })}
        />
      </div>

      {/* Duration */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <label style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)' }}>Thời lượng</label>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
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
              <label style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)' }}>Âm lượng</label>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', fontFamily: 'var(--font-mono, monospace)', fontVariantNumeric: 'tabular-nums' }}>
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
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--color-text-secondary, #52627A)', marginBottom: '4px' }}>
              Tốc độ phát
            </label>
            <Select
              value={(scene as VideoSceneConfig).playbackRate ?? 1}
              options={[
                { value: 0.5, label: '0.5x (Chậm)' },
                { value: 1, label: '1.0x (Chuẩn)' },
                { value: 1.5, label: '1.5x (Nhanh)' },
                { value: 2, label: '2.0x (Gấp đôi)' },
              ]}
              onChange={(e) => update({ playbackRate: parseFloat(e.target.value) })}
            />
          </div>
        </>
      )}

      {/* Image Specific: Subtle Zoom Animation */}
      {!isVideo && (
        <div style={{ marginTop: '4px' }}>
          <Checkbox
            id="zoomAnim"
            checked={!!(scene as ImageSceneConfig).zoomAnimation}
            onChange={(checked) => update({ zoomAnimation: checked })}
            label="Kích hoạt hiệu ứng zoom chuyển động Ken Burns"
          />
        </div>
      )}
    </div>
  );
};
