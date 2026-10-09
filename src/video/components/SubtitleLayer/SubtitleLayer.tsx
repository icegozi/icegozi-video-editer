import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { Caption } from '@remotion/captions';
import { SafeArea } from '../SafeArea/SafeArea';

export interface SubtitleLayerProps {
  captions: Caption[];
  style?: React.CSSProperties;
}

/**
 * SubtitleLayer renders timestamp-synchronized captions within safe-area bounds.
 */
export const SubtitleLayer: React.FC<SubtitleLayerProps> = ({ captions, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTimeMs = (frame / fps) * 1000;

  // Find the caption active at the current timestamp
  const activeCaption = captions.find(
    (cap) => currentTimeMs >= cap.startMs && currentTimeMs <= cap.endMs
  );

  if (!activeCaption) return null;

  return (
    <SafeArea>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          height: '100%',
          paddingBottom: '3rem',
          pointerEvents: 'none',
          ...style,
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            color: '#FFFFFF',
            padding: '0.8rem 1.6rem',
            borderRadius: '8px',
            fontSize: '2rem',
            fontWeight: 600,
            maxWidth: '85%',
            textAlign: 'center',
            lineHeight: 1.3,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {activeCaption.text}
        </div>
      </div>
    </SafeArea>
  );
};
