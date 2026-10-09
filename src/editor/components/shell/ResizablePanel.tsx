import React, { useState, useRef, useCallback } from 'react';

export interface ResizablePanelProps {
  direction: 'horizontal' | 'vertical';
  initialSize: number;
  minSize: number;
  maxSize: number;
  handlePosition: 'left' | 'right' | 'top' | 'bottom';
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  direction,
  initialSize,
  minSize,
  maxSize,
  handlePosition,
  children,
  style,
}) => {
  const [size, setSize] = useState(initialSize);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(initialSize);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDraggingRef.current = true;
      startPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
      startSizeRef.current = size;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [direction, size]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPosRef.current;

      let newSize = startSizeRef.current;
      if (handlePosition === 'right' || handlePosition === 'bottom') {
        newSize += delta;
      } else {
        newSize -= delta;
      }

      setSize(Math.max(minSize, Math.min(maxSize, newSize)));
    },
    [direction, handlePosition, minSize, maxSize]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  }, []);

  const isHoriz = direction === 'horizontal';
  const sizeStyle: React.CSSProperties = isHoriz
    ? { width: `${size}px`, minWidth: `${minSize}px`, maxWidth: `${maxSize}px` }
    : { height: `${size}px`, minHeight: `${minSize}px`, maxHeight: `${maxSize}px` };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-panel)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        flexShrink: 0,
        ...sizeStyle,
        ...style,
      }}
    >
      {children}

      {/* Resize Handle */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'absolute',
          ...(handlePosition === 'right'
            ? { right: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize' }
            : handlePosition === 'left'
            ? { left: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize' }
            : handlePosition === 'top'
            ? { top: 0, left: 0, right: 0, height: '4px', cursor: 'row-resize' }
            : { bottom: 0, left: 0, right: 0, height: '4px', cursor: 'row-resize' }),
          zIndex: 15,
          backgroundColor: 'transparent',
          transition: 'background-color 150ms ease',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'var(--accent)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
      />
    </div>
  );
};
