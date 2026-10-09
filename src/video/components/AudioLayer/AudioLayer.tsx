import React from 'react';
import { Audio, Sequence, staticFile, interpolate } from 'remotion';
import { AudioTrackConfig } from '../../../domain/video/AudioTrack';

export interface AudioLayerProps {
  track: AudioTrackConfig;
  muted?: boolean;
}

/**
 * Independent audio layer component.
 * Supports start offset, duration trimming, volume envelope, and frame-based fade in/out.
 */
export const AudioLayer: React.FC<AudioLayerProps> = ({ track, muted = false }) => {
  if (muted) {
    return null;
  }

  const resolvedSrc = track.src.startsWith('http') || track.src.startsWith('/')
    ? track.src
    : staticFile(track.src);


  const duration = track.durationInFrames;
  const fadeIn = track.fadeInFrames || 0;
  const fadeOut = track.fadeOutFrames || 0;
  const maxVolume = track.volume;

  // Frame-dependent volume envelope
  const volumeCallback = (frame: number): number => {
    let vol = maxVolume;

    // Fade in
    if (fadeIn > 0 && frame < fadeIn) {
      vol = interpolate(frame, [0, fadeIn], [0, maxVolume], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });
    }

    // Fade out
    if (duration && fadeOut > 0 && frame > duration - fadeOut) {
      const fadeOutVol = interpolate(
        frame,
        [duration - fadeOut, duration],
        [maxVolume, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );
      vol = Math.min(vol, fadeOutVol);
    }

    return vol;
  };

  return (
    <Sequence from={track.startFrame} durationInFrames={duration}>
      <Audio
        src={resolvedSrc}
        volume={volumeCallback}
        loop={track.loop}
      />
    </Sequence>
  );
};
