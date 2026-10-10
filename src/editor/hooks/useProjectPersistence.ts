import { useEffect, useRef, useCallback } from 'react';
import { useEditor } from '../state/editorStore';
import { ProjectStorage } from '../../infrastructure/storage/ProjectStorage';
import { demoProject } from '../../../projects/demo/project';

export function useProjectPersistence() {
  const { state, dispatch } = useEditor();
  const isLoadedRef = useRef(false);
  const debounceTimerRef = useRef<any>(null);

  // 1. Initial Load from persistent storage on app startup
  useEffect(() => {
    if (isLoadedRef.current) return;
    isLoadedRef.current = true;

    (async () => {
      try {
        const stored = await ProjectStorage.loadCurrentProject();
        if (stored && stored.project) {
          dispatch({
            type: 'LOAD_PROJECT',
            project: stored.project,
            revision: stored.revision,
          });
        }
      } catch (err) {
        console.warn('Could not restore saved project, using default:', err);
      }
    })();
  }, [dispatch]);

  // 2. Debounced auto-save whenever project state becomes 'dirty'
  useEffect(() => {
    if (state.saveStatus !== 'dirty') return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      const savingRevision = state.revision;
      dispatch({ type: 'SET_SAVE_STATUS', status: 'saving' });

      try {
        await ProjectStorage.saveProject(state.project, savingRevision);
        dispatch({ type: 'SET_SAVE_STATUS', status: 'saved', savedAt: Date.now(), revision: savingRevision });
      } catch (err) {
        dispatch({
          type: 'SET_SAVE_STATUS',
          status: 'error',
          error: err instanceof Error ? err.message : 'Storage write failed',
        });
      }
    }, 800);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [state.saveStatus, state.revision, state.project, dispatch]);

  // 3. Explicit manual save
  const saveNow = useCallback(async () => {
    const savingRevision = state.revision;
    dispatch({ type: 'SET_SAVE_STATUS', status: 'saving' });

    try {
      await ProjectStorage.saveProject(state.project, savingRevision);
      dispatch({ type: 'SET_SAVE_STATUS', status: 'saved', savedAt: Date.now(), revision: savingRevision });
    } catch (err) {
      dispatch({
        type: 'SET_SAVE_STATUS',
        status: 'error',
        error: err instanceof Error ? err.message : 'Storage write failed',
      });
    }
  }, [state.project, state.revision, dispatch]);

  // 4. Export project JSON download
  const exportJson = useCallback(() => {
    const jsonStr = ProjectStorage.exportProjectJson(state.project);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.project.id || 'project'}.icegozi.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.project]);

  // 5. Import project JSON from file content
  const importJson = useCallback(
    (fileContent: string) => {
      try {
        const imported = ProjectStorage.importProjectJson(fileContent);
        dispatch({ type: 'LOAD_PROJECT', project: imported });
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to import project JSON');
      }
    },
    [dispatch]
  );

  // 6. Reset workspace to demo project
  const resetToDemo = useCallback(async () => {
    await ProjectStorage.clearCurrentProject();
    dispatch({ type: 'RESET_PROJECT', project: demoProject });
  }, [dispatch]);

  return {
    saveNow,
    exportJson,
    importJson,
    resetToDemo,
  };
}
