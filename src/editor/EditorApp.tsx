import React from 'react';
import { EditorProvider } from './state/editorStore';
import { EditorShell } from './components/shell/EditorShell';
import { demoProject } from '../../projects/demo/project';
import { registerBuiltInScenes } from '../app/registerCompositions';
import './tokens/editor.css';

// Ensure all built-in scene components (text, formula, video, image) are registered
registerBuiltInScenes();

export const EditorApp: React.FC = () => {
  return (
    <EditorProvider initialProject={demoProject}>
      <EditorShell />
    </EditorProvider>
  );
};
