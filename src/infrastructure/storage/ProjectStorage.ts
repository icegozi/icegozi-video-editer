import { VideoProject } from '../../domain/video/VideoProject';
import { VideoProjectSchema, migrateProject, CURRENT_SCHEMA_VERSION } from '../../schemas/project.schema';

const STORAGE_KEY_CURRENT_PROJECT = 'icegozi_current_project';
const STORAGE_KEY_CURRENT_REVISION = 'icegozi_current_revision';
const STORAGE_KEY_PROJECT_LIST = 'icegozi_project_list';

export interface PersistedProjectRecord {
  project: VideoProject;
  revision: number;
  savedAt: number;
}

export interface ProjectMetadataEntry {
  id: string;
  title: string;
  savedAt: number;
  schemaVersion: number;
}

/**
 * Storage adapter for persisting VideoProjects locally.
 * Works seamlessly in Browser (localStorage / IndexedDB) and in Node/test environments (memory fallback).
 */
export class ProjectStorage {
  private static memoryStore = new Map<string, string>();
  private static lastSavedRevision = 0;
  private static lastServerRevision = 0;

  private static getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }

  private static getItem(key: string): string | null {
    const storage = this.getStorage();
    if (storage) {
      try {
        return storage.getItem(key);
      } catch {
        return this.memoryStore.get(key) ?? null;
      }
    }
    return this.memoryStore.get(key) ?? null;
  }

  private static setItem(key: string, value: string): void {
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.setItem(key, value);
        return;
      } catch (e) {
        // Quota exceeded or private browsing error
        this.memoryStore.set(key, value);
        throw e;
      }
    }
    this.memoryStore.set(key, value);
  }

  private static removeItem(key: string): void {
    const storage = this.getStorage();
    if (storage) {
      try {
        storage.removeItem(key);
      } catch {
        // Ignore
      }
    }
    this.memoryStore.delete(key);
  }

  /**
   * Persists a project snapshot. Validates schema before saving.
   * Protects against stale out-of-order writes and multi-tab overwrite using the revision number.
   */
  static async saveProject(
    project: VideoProject,
    revision: number
  ): Promise<{ revision: number; savedAt: number }> {
    // Validate schema before persisting
    const validated = VideoProjectSchema.parse(project) as VideoProject;
    const now = Date.now();

    // Check in-memory revision to prevent older async save from same tab overwriting a newer state
    if (revision < this.lastSavedRevision) {
      return { revision: this.lastSavedRevision, savedAt: now };
    }

    // Check localStorage revision to prevent overwriting newer work saved by another tab
    const storedRevStr = this.getItem(STORAGE_KEY_CURRENT_REVISION);
    if (storedRevStr) {
      const storedRev = parseInt(storedRevStr, 10);
      if (Number.isFinite(storedRev) && storedRev > this.lastSavedRevision && revision < storedRev) {
        this.lastSavedRevision = Math.max(this.lastSavedRevision, storedRev);
        throw new Error(
          `Stale write conflict: Storage already contains newer revision ${storedRev} (attempted to save revision ${revision}).`
        );
      }
    }

    const record: PersistedProjectRecord = {
      project: validated,
      revision,
      savedAt: now,
    };

    const serialized = JSON.stringify(record);
    this.setItem(STORAGE_KEY_CURRENT_PROJECT, serialized);
    this.setItem(STORAGE_KEY_CURRENT_REVISION, String(revision));
    this.lastSavedRevision = revision;

    // Update project list
    this.updateProjectCatalog(validated, now);

    // Asynchronously sync to backend SQLite database if in browser environment
    if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project: validated,
            revision,
            expectedRevision: this.lastServerRevision > 0 ? this.lastServerRevision : undefined,
            changeSummary: `Revision ${revision}`,
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(
            errorData.error || `Project saved locally; SQLite sync failed (HTTP ${response.status}).`
          );
        }

        const syncResult = (await response.json().catch(() => ({}))) as { revision?: number };
        if (syncResult && typeof syncResult.revision === 'number') {
          this.lastServerRevision = syncResult.revision;
        }
      } catch (err) {
        if (err instanceof Error && (err.message.includes('SQLite sync failed') || err.message.includes('Stale revision conflict'))) {
          throw err;
        }
        // If offline (navigator.onLine === false), allow local save without breaking editor
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          console.warn('Offline mode: project persisted locally in browser.');
        } else {
          throw err;
        }
      }
    }

    return { revision, savedAt: now };
  }

  /**
   * Loads the active project from storage, applying schema migration if needed.
   */
  static async loadCurrentProject(): Promise<PersistedProjectRecord | null> {
    const raw = this.getItem(STORAGE_KEY_CURRENT_PROJECT);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;

      const projectData = (parsed as PersistedProjectRecord).project ?? parsed;
      const revision = typeof (parsed as PersistedProjectRecord).revision === 'number'
        ? (parsed as PersistedProjectRecord).revision
        : 0;
      const savedAt = typeof (parsed as PersistedProjectRecord).savedAt === 'number'
        ? (parsed as PersistedProjectRecord).savedAt
        : Date.now();

      const migrated = migrateProject(projectData);
      this.lastSavedRevision = revision;

      return {
        project: migrated,
        revision,
        savedAt,
      };
    } catch (error) {
      console.error('Failed to load current project from storage:', error);
      return null;
    }
  }

  /**
   * Clears the saved current project, reverting workspace to default.
   */
  static async clearCurrentProject(): Promise<void> {
    this.removeItem(STORAGE_KEY_CURRENT_PROJECT);
    this.removeItem(STORAGE_KEY_CURRENT_REVISION);
    this.lastSavedRevision = 0;
    this.lastServerRevision = 0;
  }

  /**
   * For testing multi-tab scenarios: updates the shared storage revision
   * without updating this tab's in-memory lastSavedRevision.
   */
  static simulateExternalStorageRevision(revision: number): void {
    this.setItem(STORAGE_KEY_CURRENT_REVISION, String(revision));
  }

  /**
   * Exports a project to a formatted JSON string.
   */
  static exportProjectJson(project: VideoProject): string {
    const validated = VideoProjectSchema.parse(project);
    return JSON.stringify(validated, null, 2);
  }

  /**
   * Imports a project from JSON string, validating and migrating if necessary.
   */
  static importProjectJson(jsonString: string): VideoProject {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      throw new Error('Invalid JSON format: Unable to parse project file');
    }

    return migrateProject(parsed);
  }

  /**
   * Lists catalog of saved projects.
   */
  static listProjects(): ProjectMetadataEntry[] {
    const raw = this.getItem(STORAGE_KEY_PROJECT_LIST);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as ProjectMetadataEntry[];
    } catch {
      return [];
    }
  }

  private static updateProjectCatalog(project: VideoProject, savedAt: number): void {
    const list = this.listProjects();
    const existingIndex = list.findIndex((p) => p.id === project.id);
    const entry: ProjectMetadataEntry = {
      id: project.id,
      title: project.title,
      savedAt,
      schemaVersion: project.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = entry;
    } else {
      list.unshift(entry);
    }

    this.setItem(STORAGE_KEY_PROJECT_LIST, JSON.stringify(list.slice(0, 20)));
  }
}
