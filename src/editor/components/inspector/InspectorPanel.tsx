import React from 'react';
import { Sliders, X, XCircle } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { PanelHeader } from '../shell/PanelHeader';
import { IconButton } from '../ui/IconButton';
import { ProjectInspector } from './ProjectInspector';
import { TextInspector } from './TextInspector';
import { FormulaInspector } from './FormulaInspector';
import { MediaInspector } from './MediaInspector';

export const InspectorPanel: React.FC = () => {
  const { state, dispatch } = useEditor();
  const selectedScene = state.project.scenes.find((s) => s.id === state.selectedClipId);

  const renderContent = () => {
    if (!selectedScene) {
      return <ProjectInspector />;
    }

    switch (selectedScene.type) {
      case 'text':
        return <TextInspector scene={selectedScene} />;
      case 'formula':
        return <FormulaInspector scene={selectedScene} />;
      case 'video':
      case 'image':
        return <MediaInspector scene={selectedScene} />;
      default:
        return <ProjectInspector />;
    }
  };

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      data-testid="inspector-panel"
    >
      <PanelHeader
        title={selectedScene ? `Clip: ${selectedScene.type.toUpperCase()}` : 'Thuộc tính dự án'}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {selectedScene && (
              <IconButton
                icon={<XCircle size={13} />}
                label="Bỏ chọn clip (Hiện thuộc tính dự án)"
                size="sm"
                onClick={() => dispatch({ type: 'SET_SELECTED_CLIP', clipId: null })}
              />
            )}
            <IconButton
              icon={<X size={14} />}
              label="Đóng thanh thuộc tính"
              size="sm"
              onClick={() => dispatch({ type: 'SET_INSPECTOR_OPEN', open: false })}
            />
          </div>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>{renderContent()}</div>
    </aside>
  );
};
