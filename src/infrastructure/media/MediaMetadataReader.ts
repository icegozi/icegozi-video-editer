import { FfprobeClient } from '../ffmpeg/FfprobeClient';
import { MediaAsset } from '../../domain/video/MediaAsset';
import { logger } from '../logging/logger';

export class MediaMetadataReader {
  /**
   * Reads metadata for a media asset and updates its metadata property.
   */
  static async enrichAsset(asset: MediaAsset): Promise<MediaAsset> {
    try {
      logger.debug(`Enriching metadata for asset: ${asset.id} (${asset.path})`);
      const metadata = await FfprobeClient.probe(asset.path);
      return {
        ...asset,
        metadata,
      };
    } catch (error) {
      logger.warn(`Failed to enrich asset ${asset.id}: ${error instanceof Error ? error.message : String(error)}`);
      return asset;
    }
  }
}
