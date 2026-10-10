import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import type { RegisteredAsset } from '../../application/scene-generation/generation.contracts';
import { AssistantError } from '../../application/assistant/errors';
import { FfprobeClient } from '../ffmpeg/FfprobeClient';
import { FfmpegClient } from '../ffmpeg/FfmpegClient';
import { GENERATION_LIMITS } from '../../application/scene-generation/catalog';
import { containedPath } from '../../application/scene-generation/containedPath';
function signature(file: string): {
  mimeType: string;
  extension: string;
  kind: 'image' | 'video';
} {
  const bytes = Buffer.alloc(32);
  const fd = fs.openSync(file, 'r');
  try {
    fs.readSync(fd, bytes, 0, 32, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return { mimeType: 'image/png', extension: 'png', kind: 'image' };
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return { mimeType: 'image/jpeg', extension: 'jpg', kind: 'image' };
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP')
    return { mimeType: 'image/webp', extension: 'webp', kind: 'image' };
  if (bytes.toString('ascii', 4, 8) === 'ftyp')
    return { mimeType: 'video/mp4', extension: 'mp4', kind: 'video' };
  throw new AssistantError('invalid_media', 'Kết quả không phải ảnh hoặc MP4 hợp lệ.');
}
export class AssetIngestService {
  constructor(private assetRoot: string) {
    fs.mkdirSync(assetRoot, { recursive: true });
  }
  async prepare(
    file: string,
    kind: 'image' | 'video',
    claimedMime: string,
    jobId: string,
    signal: AbortSignal,
  ): Promise<RegisteredAsset> {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size < 16 || stat.size > GENERATION_LIMITS.maxOutputBytes)
      throw new AssistantError('invalid_media', 'Kích thước media không hợp lệ.');
    const detected = signature(file);
    if (detected.kind !== kind || detected.mimeType !== claimedMime)
      throw new AssistantError('invalid_media', 'Nội dung media không khớp định dạng khai báo.');
    // The bundled image demuxer identifies codecs from a trusted extension.
    const probeFile =
      path.extname(file).toLowerCase() === `.${detected.extension}`
        ? file
        : path.join(path.dirname(file), `inspect-${randomUUID()}.${detected.extension}`);
    if (probeFile !== file) fs.copyFileSync(file, probeFile, fs.constants.COPYFILE_EXCL);
    try {
      const metadata = await FfprobeClient.probe(probeFile);
      if (
        !metadata.width ||
        !metadata.height ||
        metadata.width * metadata.height > 4096 * 4096 ||
        (kind === 'video' && (!metadata.durationInSeconds || metadata.durationInSeconds > 31))
      ) {
        throw new AssistantError(
          'invalid_media',
          'Không đọc được kích thước hoặc thời lượng media hợp lệ.',
        );
      }
      await new Promise<void>((resolve, reject) =>
        execFile(
          FfmpegClient.getBinaryPath(),
          ['-v', 'error', '-i', probeFile, '-map', '0:v:0', '-c:v', 'rawvideo', '-f', 'null', '-'],
          { signal, timeout: 90000, windowsHide: true, maxBuffer: 1024 * 1024 },
          (error) =>
            error
              ? reject(new AssistantError('invalid_media', 'Không giải mã được media.'))
              : resolve(),
        ),
      );
      signal.throwIfAborted();
      const hash = await new Promise<string>((resolve, reject) => {
        const digest = createHash('sha256');
        const stream = fs.createReadStream(probeFile, { signal });
        stream.on('data', (data: Buffer | string) => digest.update(data));
        stream.on('end', () => resolve(digest.digest('hex')));
        stream.on('error', reject);
      });
      const subfolder = kind === 'image' ? 'images' : 'video';
      const directory = path.join(this.assetRoot, subfolder);
      fs.mkdirSync(directory, { recursive: true });
      const id = randomUUID();
      const target = containedPath(
        this.assetRoot,
        path.join(directory, `${id}.${detected.extension}`),
        false,
      );
      signal.throwIfAborted();
      fs.renameSync(probeFile, target);
      if (probeFile !== file) fs.unlinkSync(file);
      return {
        id,
        storageKey: `assets/${subfolder}/${id}.${detected.extension}`,
        mediaType: kind,
        mimeType: detected.mimeType,
        fileSizeBytes: stat.size,
        hash,
        metadata,
        origin: 'generated',
        jobId,
      };
    } finally {
      if (probeFile !== file && fs.existsSync(probeFile)) fs.unlinkSync(probeFile);
    }
  }
  file(asset: RegisteredAsset): string {
    const actual = containedPath(
      this.assetRoot,
      path.join(this.assetRoot, asset.storageKey.replace(/^assets\//, '')),
    );
    if (!fs.statSync(actual).isFile() || fs.statSync(actual).size !== asset.fileSizeBytes)
      throw new AssistantError('media_missing', 'Media đã tạo bị mất hoặc thay đổi.');
    return actual;
  }
  async verify(asset: RegisteredAsset): Promise<void> {
    const file = this.file(asset);
    const hash = createHash('sha256');
    for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
    if (hash.digest('hex') !== asset.hash)
      throw new AssistantError('asset_changed', 'Media đã tạo bị thay đổi.');
  }
  discardUnregistered(asset: RegisteredAsset): void {
    const file = this.file(asset);
    fs.unlinkSync(file);
  }
}
