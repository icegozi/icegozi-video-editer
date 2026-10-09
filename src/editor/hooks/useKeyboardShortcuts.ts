import { useEffect } from 'react';
import { useEditor } from '../state/editorStore';

export function useKeyboardShortcuts() {
  const { state, dispatch } = useEditor();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Global key combos with Ctrl / Cmd (allowed even inside inputs if relevant)
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

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

      // STRICT FOCUS GUARD: Skip single-key shortcuts when typing in inputs/textareas
      if (isInput) {
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
  }, [state.selectedClipId, state.currentFrame, state.zoomPixelsPerSecond, state.project.scenes.length, dispatch]);
}
