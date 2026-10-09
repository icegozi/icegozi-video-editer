import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { SafeArea } from '../SafeArea/SafeArea';

export interface FormulaOverlayProps {
  latex: string;
  title?: string;
  explanation?: string;
  fontSize?: number;
  textColor?: string;
  style?: React.CSSProperties;
}

/**
 * FormulaOverlay accurately renders mathematical formulas and equations.
 * Designed so mathematical notation can be displayed crisply and deterministically
 * without relying on hallucinated AI images.
 */
export const FormulaOverlay: React.FC<FormulaOverlayProps> = ({
  latex,
  title,
  explanation,
  fontSize = 64,
  textColor = '#E2E8F0',
  style,
}) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, 20], [0.95, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <SafeArea>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          opacity,
          transform: `scale(${scale})`,
          fontFamily: 'Inter, system-ui, sans-serif',
          color: textColor,
          ...style,
        }}
      >
        {title && (
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 600,
              color: '#94A3B8',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '1.5rem',
            }}
          >
            {title}
          </div>
        )}

        {/* Mathematical formula container */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '16px',
            padding: '2.5rem 4rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: '"KaTeX_Main", "Cambria Math", "Latin Modern Math", "STIX Two Math", serif',
              fontSize: `${fontSize}px`,
              fontWeight: 500,
              letterSpacing: '0.03em',
              color: '#38BDF8',
              textShadow: '0 0 30px rgba(56, 189, 248, 0.35)',
            }}
          >
            {latex}
          </div>
        </div>

        {explanation && (
          <div
            style={{
              fontSize: '1.5rem',
              color: '#CBD5E1',
              marginTop: '2rem',
              maxWidth: '70%',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            {explanation}
          </div>
        )}
      </div>
    </SafeArea>
  );
};
