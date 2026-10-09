import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { useEditor } from '../../state/editorStore';
import { MainVideo } from '../../../video/compositions/MainVideo/MainVideo';
import { CanvasToolbar } from './CanvasToolbar';
import { TransportControls } from './TransportControls';

export const PreviewWorkspace: React.FC = () => {
  const { state, dispatch } = useEditor();
  const playerRef = useRef<PlayerRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoomMode, setZoomMode] = useState<'fit' | '50' | '100'>('fit');
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const isSyncingRef = useRef(false);

  // Sync state.currentFrame -> Player
  useEffect(() => {
    if (!playerRef.current) return;
    if (isSyncingRef.current) return;

    const playerFrame = playerRef.current.getCurrentFrame();
    if (playerFrame !== state.currentFrame) {
      playerRef.current.seekTo(state.currentFrame);
    }
  }, [state.currentFrame]);

  // Sync volume -> Player
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      playerRef.current.setVolume(volume);
    } catch {
      // Ignore if player not fully mounted
    }
  }, [volume]);


  // Sync state.isPlaying -> Player
  useEffect(() => {
    if (!playerRef.current) return;

    if (state.isPlaying && !playerRef.current.isPlaying()) {
      playerRef.current.play();
    } else if (!state.isPlaying && playerRef.current.isPlaying()) {
      playerRef.current.pause();
    }
  }, [state.isPlaying]);

  // Attach Player event listeners for frameupdate and play/pause
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onFrameUpdate = (e: { detail: { frame: number } }) => {
      isSyncingRef.current = true;
      dispatch({ type: 'SET_CURRENT_FRAME', frame: Math.round(e.detail.frame) });
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    };

    const onPlay = () => {
      dispatch({ type: 'SET_IS_PLAYING', isPlaying: true });
    };

    const onPause = () => {
      dispatch({ type: 'SET_IS_PLAYING', isPlaying: false });
    };

    player.addEventListener('frameupdate', onFrameUpdate);
    player.addEventListener('play', onPlay);
    player.addEventListener('pause', onPause);

    return () => {
      player.removeEventListener('frameupdate', onFrameUpdate);
      player.removeEventListener('play', onPlay);
      player.removeEventListener('pause', onPause);
    };
  }, [dispatch]);

  const handleFullscreenToggle = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Compute player sizing based on zoomMode
  const getPlayerStyles = (): React.CSSProperties => {
    if (zoomMode === '50') {
      return {
        width: `${state.project.width * 0.5}px`,
        height: `${state.project.height * 0.5}px`,
        maxWidth: 'none',
      };
    }
    if (zoomMode === '100') {
      return {
        width: `${state.project.width}px`,
        height: `${state.project.height}px`,
        maxWidth: 'none',
      };
    }
    // 'fit'
    return {
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      maxHeight: '100%',
    };
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-app)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top Toolbar */}
      <CanvasToolbar
        zoomMode={zoomMode}
        onZoomChange={setZoomMode}
        onFullscreenToggle={handleFullscreenToggle}
      />

      {/* Main Viewport Canvas */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          boxSizing: 'border-box',
          overflow: 'auto',
          backgroundColor: '#07090C',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.7)',
            borderRadius: '4px',
            overflow: 'hidden',
            backgroundColor: '#000000',
            aspectRatio: `${state.project.width} / ${state.project.height}`,
            ...getPlayerStyles(),
          }}
        >
          <Player
            ref={playerRef}
            component={MainVideo}
            inputProps={{ project: state.project }}
            durationInFrames={Math.max(1, state.timeline.totalDurationInFrames)}
            compositionWidth={state.project.width}
            compositionHeight={state.project.height}
            fps={state.project.fps}
            playbackRate={playbackRate}
            style={{
              width: '100%',
              height: '100%',
            }}
            controls={false}
          />

          {/* Safe Area Overlay Guide */}
          {state.isSafeAreasVisible && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                boxSizing: 'border-box',
              }}
            >
              {/* Action Safe (90%) */}
              <div
                style={{
                  position: 'absolute',
                  top: '5%',
                  bottom: '5%',
                  left: '5%',
                  right: '5%',
                  border: '1px dashed rgba(91, 140, 255, 0.5)',
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: '4px',
                    fontSize: '9px',
                    color: 'rgba(91, 140, 255, 0.7)',
                    fontWeight: 600,
                  }}
                >
                  ACTION SAFE (90%)
                </span>
              </div>

              {/* Title Safe (80%) */}
              <div
                style={{
                  position: 'absolute',
                  top: '10%',
                  bottom: '10%',
                  left: '10%',
                  right: '10%',
                  border: '1px dashed rgba(242, 184, 75, 0.5)',
                  boxSizing: 'border-box',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: '4px',
                    fontSize: '9px',
                    color: 'rgba(242, 184, 75, 0.7)',
                    fontWeight: 600,
                  }}
                >
                  TITLE SAFE (80%)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Transport Controls */}
      <TransportControls
        playbackRate={playbackRate}
        onPlaybackRateChange={setPlaybackRate}
        volume={volume}
        onVolumeChange={setVolume}
      />
    </div>
  );
};
