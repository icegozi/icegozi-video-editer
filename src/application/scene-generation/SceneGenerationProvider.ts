import type { GenerationPlan } from './generation.contracts';

export interface SceneGenerationProvider {
  id: string;
  generate(
    plan: GenerationPlan,
    outputPath: string,
    reference: { mimeType: string; data: Buffer } | undefined,
    signal: AbortSignal,
    progress: (percent: number) => void,
  ): Promise<{ mimeType: string }>;
}
