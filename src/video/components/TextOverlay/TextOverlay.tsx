import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { SafeArea } from '../SafeArea/SafeArea';

export interface TextOverlayProps {
  title: string;
  subtitle?: string;
  textColor?: string;
  animationType?: 'fade' | 'slide-up' | 'typewriter' | 'scale';
  fontSize?: number;
  startScale?: number;
  endScale?: number;
  durationInFrames?: number;
  align?: 'left' | 'center' | 'right';
  style?: React.CSSProperties;
}

/**
 * TextOverlay renders typography with deterministic frame-based entrance animations.
 */
export const TextOverlay: React.FC<TextOverlayProps> = ({
  title,
  subtitle,
  textColor = '#FFFFFF',
  animationType = 'fade',
  fontSize,
  startScale = 0.25,
  endScale = 1.5,
  durationInFrames = 150,
  align = 'center',
  style,
}) => {
  const frame = useCurrentFrame();

  // Entrance animation curve (first 20 frames)
  const opacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const translateY = animationType === 'slide-up'
    ? interpolate(frame, [0, 20], [40, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : 0;

  // Typewriter effect calculation
  let displayTitle = title;
  if (animationType === 'typewriter') {
    const charsToShow = Math.floor(
      interpolate(frame, [0, 30], [0, title.length], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    );
    displayTitle = title.slice(0, charsToShow);
  }

  const alignmentStyles: React.CSSProperties = {
    textAlign: align,
    alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
  };

  return (
    <SafeArea>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          height: '100%',
          opacity: animationType === 'scale' ? 1 : opacity,
          transform: `translateY(${translateY}px)`,
          scale: animationType === 'scale' ? interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [startScale, endScale], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          }) : undefined,
          color: textColor,
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
          ...alignmentStyles,
          ...style,
        }}
      >
        <h1
          style={{
            fontSize: fontSize ?? '4.5rem',
            fontWeight: 800,
            margin: '0 0 1rem 0',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          {displayTitle}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: '2.2rem',
              fontWeight: 400,
              margin: 0,
              color: 'rgba(255, 255, 255, 0.85)',
              maxWidth: '80%',
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </SafeArea>
  );
};
