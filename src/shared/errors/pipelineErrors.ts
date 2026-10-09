export class VideoPipelineError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, unknown>;

  constructor(message: string, code: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'VideoPipelineError';
    this.code = code;
    this.context = context;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class MediaNotFoundError extends VideoPipelineError {
  constructor(filePath: string, context?: Record<string, unknown>) {
    super(`Media asset not found: ${filePath}`, 'MEDIA_NOT_FOUND', { filePath, ...context });
    this.name = 'MediaNotFoundError';
  }
}

export class InvalidTimelineError extends VideoPipelineError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'INVALID_TIMELINE', context);
    this.name = 'InvalidTimelineError';
  }
}

export class InvalidProjectSchemaError extends VideoPipelineError {
  constructor(message: string, errors: unknown) {
    super(message, 'INVALID_PROJECT_SCHEMA', { errors });
    this.name = 'InvalidProjectSchemaError';
  }
}

export class FfmpegError extends VideoPipelineError {
  constructor(
    message: string,
    public readonly exitCode: number | null,
    public readonly command: string,
    public readonly stderr: string,
    context?: Record<string, unknown>
  ) {
    super(
      `${message} (Exit Code: ${exitCode})\nCommand: ${command}\nStderr:\n${stderr.slice(-500)}`,
      'FFMPEG_ERROR',
      { exitCode, command, ...context }
    );
    this.name = 'FfmpegError';
  }
}

export class MediaInspectionError extends VideoPipelineError {
  constructor(filePath: string, reason: string, context?: Record<string, unknown>) {
    super(`Failed to inspect media at ${filePath}: ${reason}`, 'MEDIA_INSPECTION_ERROR', {
      filePath,
      reason,
      ...context,
    });
    this.name = 'MediaInspectionError';
  }
}

export class UnknownSceneTypeError extends VideoPipelineError {
  constructor(sceneType: string, sceneId?: string) {
    super(`Scene type "${sceneType}" has no registered renderer component.`, 'UNKNOWN_SCENE_TYPE', {
      sceneType,
      sceneId,
    });
    this.name = 'UnknownSceneTypeError';
  }
}

export class RenderPreparationError extends VideoPipelineError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'RENDER_PREPARATION_ERROR', context);
    this.name = 'RenderPreparationError';
  }
}
