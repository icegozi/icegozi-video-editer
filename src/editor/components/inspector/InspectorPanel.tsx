import React from 'react';
import { Sliders, X } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { PanelHeader } from '../shell/PanelHeader';
import { IconButton } from '../ui/IconButton';
import { ProjectInspector } from './ProjectInspector';
import { TextInspector } from './TextInspector';
import { FormulaInspector } from './FormulaInspector';
import { MediaInspector } from './MediaInspector';
import { SceneConfig } from '../../../domain/video/Scene';

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
        backgroundColor: 'var(--bg-panel)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <PanelHeader
        title={selectedScene ? `Clip: ${selectedScene.type.toUpperCase()}` : 'Project Properties'}
        actions={
          selectedScene ? (
            <IconButton
              icon={<X size={13} />}
              label="Deselect Clip (Show Project)"
              size="sm"
              onClick={() => dispatch({ type: 'SET_SELECTED_CLIP', clipId: null })}
            />
          ) : (
            <IconButton icon={<Sliders size={13} />} label="Properties" size="sm" />
          )
        }
      />

      <div style={{ flex: 1, overflowY: 'auto' }}>{renderContent()}</div>
    </aside>
  );
};
