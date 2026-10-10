import { useEffect } from 'react';
import { useEditor } from '../state/editorStore';
import { ProjectStorage } from '../../infrastructure/storage/ProjectStorage';

export function useKeyboardShortcuts() {
  const { state, dispatch } = useEditor();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Handle Escape for closing modal
      if (e.key === 'Escape') {
        if (state.isExportModalOpen) {
          e.preventDefault();
          dispatch({ type: 'SET_EXPORT_MODAL', open: false });
          return;
        }
      }

      // STRICT FOCUS & IME GUARD:
      // If typing inside inputs/textareas/select or during IME composition (Vietnamese typing),
      // DO NOT override browser native undo or typing keys!
      if (isInput || e.isComposing || e.keyCode === 229) {
        return;
      }

      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      // Ctrl/Cmd + S: Save project
      if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        dispatch({ type: 'SET_SAVE_STATUS', status: 'saving' });
        const savingRevision = state.revision;
        ProjectStorage.saveProject(state.project, savingRevision)
          .then(() => {
            dispatch({ type: 'SET_SAVE_STATUS', status: 'saved', savedAt: Date.now(), revision: savingRevision });
          })
          .catch((err) => {
            dispatch({
              type: 'SET_SAVE_STATUS',
              status: 'error',
              error: err instanceof Error ? err.message : 'Save failed',
            });
          });
        return;
      }

      // Undo / Redo
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          dispatch({ type: 'REDO' });
        } else {
          dispatch({ type: 'UNDO' });
        }
        return;
      }

      if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        dispatch({ type: 'REDO' });
        return;
      }

      // Single-key shortcuts
      if (e.code === 'Space') {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_PLAYING' });
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedClipId && state.project.scenes.length > 1) {
          e.preventDefault();
          dispatch({ type: 'DELETE_SCENE', sceneId: state.selectedClipId });
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const delta = e.shiftKey ? -10 : -1;
        dispatch({ type: 'SET_CURRENT_FRAME', frame: state.currentFrame + delta });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        dispatch({ type: 'SET_CURRENT_FRAME', frame: state.currentFrame + delta });
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        dispatch({ type: 'SET_ZOOM', pixelsPerSecond: state.zoomPixelsPerSecond + 20 });
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        dispatch({ type: 'SET_ZOOM', pixelsPerSecond: state.zoomPixelsPerSecond - 20 });
      } else if (e.key.toLowerCase() === 'k') {
        if (state.selectedClipId) {
          e.preventDefault();
          dispatch({
            type: 'SPLIT_SCENE',
            sceneId: state.selectedClipId,
            atFrame: state.currentFrame,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    state.selectedClipId,
    state.currentFrame,
    state.zoomPixelsPerSecond,
    state.project,
    state.revision,
    state.isExportModalOpen,
    dispatch,
  ]);
}
