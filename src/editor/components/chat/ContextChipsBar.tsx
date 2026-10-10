import React from 'react';
import { Film, Clock, X } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { formatTimecode } from '../../geometry/timecode';

export const ContextChipsBar: React.FC = () => {
  const { state, dispatch } = useEditor();

  const selectedScene = state.project.scenes.find((s) => s.id === state.selectedClipId);
  const currentTimecode = formatTimecode(state.currentFrame, state.project.fps);

  if (!selectedScene && state.currentFrame === 0) {
    return null;
  }

  const getSceneName = () => {
    if (!selectedScene) return null;
    if (selectedScene.type === 'text') return selectedScene.title || 'Text Scene';
    if (selectedScene.type === 'formula') return selectedScene.title || selectedScene.latex || 'Formula Scene';
    if (selectedScene.type === 'video' || selectedScene.type === 'image') {
      return selectedScene.src.split('/').pop() || selectedScene.id;
    }
    return selectedScene.id;
  };

  const sceneName = getSceneName();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: 'var(--color-surface-muted, #F8FAFC)',
        borderTop: '1px solid var(--color-border-subtle, #E2E8F0)',
        fontSize: '11px',
      }}
      aria-label="Ngữ cảnh đính kèm"
    >
      <span style={{ color: 'var(--color-text-muted, #64748B)', fontWeight: 500, fontSize: '10px' }}>
        Ngữ cảnh:
      </span>

      {sceneName && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            backgroundColor: 'var(--color-brand-subtle, #EEF3FF)',
            color: 'var(--color-brand, #3568E8)',
            border: '1px solid var(--color-border-default, #CBD5E1)',
            borderRadius: '12px',
            fontWeight: 500,
          }}
          title={`Clip đang chọn: ${selectedScene?.id}`}
        >
          <Film size={11} />
          <span>@{sceneName}</span>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_SELECTED_CLIP', clipId: null })}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'var(--color-brand, #3568E8)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            aria-label="Bỏ chọn clip"
          >
            <X size={10} />
          </button>
        </span>
      )}

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          backgroundColor: 'var(--color-surface, #FFFFFF)',
          color: 'var(--color-text-secondary, #475569)',
          border: '1px solid var(--color-border-default, #CBD5E1)',
          borderRadius: '12px',
          fontWeight: 500,
        }}
        title={`Khung hình hiện tại: Frame ${state.currentFrame}`}
      >
        <Clock size={11} />
        <span>@{currentTimecode} (F{state.currentFrame})</span>
      </span>
    </div>
  );
};
