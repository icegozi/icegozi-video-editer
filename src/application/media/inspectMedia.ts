import { FfprobeClient } from '../../infrastructure/ffmpeg/FfprobeClient';
import { MediaMetadata } from '../../domain/video/MediaAsset';

/**
 * Inspects a media file on disk and returns its typed technical metadata.
 */
export async function inspectMedia(filePath: string): Promise<MediaMetadata> {
  return FfprobeClient.probe(filePath);
}
