import { RenderProfile, RenderProfileSettings } from '../../config/render.config';

export interface RenderPreparation {
  compositionId: string;
  outputPath: string;
  profile: RenderProfileSettings;
  entryFile: string;
}

export interface RenderExecutionResult {
  outputPath: string;
  profileName: RenderProfile;
  renderDurationMs: number;
  fileSizeBytes: number;
}
