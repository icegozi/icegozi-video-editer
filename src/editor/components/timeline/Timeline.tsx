import React, { useRef } from 'react';
import { useEditor } from '../../state/editorStore';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrackHeader } from './TimelineTrackHeader';
import { TimelineTrack } from './TimelineTrack';
import { TimelineClip } from './TimelineClip';
import { TimelinePlayhead } from './TimelinePlayhead';
import { framesToPixels } from '../../geometry/timelineGeometry';
import { getSceneTrackId } from '../../../domain/video/trackUtils';

export const Timeline: React.FC = () => {
  const { state, dispatch } = useEditor();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { fps } = state.project;
  const pps = state.zoomPixelsPerSecond;
  const totalFrames = state.timeline.totalDurationInFrames;

  // Calculate width with a generous buffer at the end
  const totalWidthPx = Math.max(1200, framesToPixels(totalFrames, fps, pps) + 300);

  // Divide scenes into V2 and V1 using unified track assignment helper
  const overlayScenes = state.timeline.computedScenes.filter(
    (cs) => getSceneTrackId(cs.scene, state.project.scenes) === 'V2'
  );
  const primaryScenes = state.timeline.computedScenes.filter(
    (cs) => getSceneTrackId(cs.scene, state.project.scenes) === 'V1'
  );

  const audioTracks = state.project.audioTracks ?? [];
  const tracksCount = 2 + Math.max(1, audioTracks.length);
  const tracksHeight = tracksCount * 52;

  const v1Setting = state.project.trackSettings?.['V1'];
  const v2Setting = state.project.trackSettings?.['V2'];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Top Timeline Toolbar */}
      <TimelineToolbar />

      {/* Main Timeline Body (Headers + Tracks Grid) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Left Sticky Track Headers */}
        <div
          style={{
            width: '180px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-panel)',
            zIndex: 30,
          }}
        >
          {/* Header spacer for Ruler */}
          <div
            style={{
              height: '28px',
              backgroundColor: 'var(--bg-surface)',
              borderBottom: '1px solid var(--border-subtle)',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            Tracks
          </div>

          {/* V2 Header */}
          <TimelineTrackHeader
            label="V2"
            name="Overlays / Text"
            type="video"
            visible={!v2Setting?.hidden}
            locked={Boolean(v2Setting?.locked)}
            onToggleVisible={() =>
              dispatch({
                type: 'SET_TRACK_SETTING',
                trackId: 'V2',
                setting: { hidden: !v2Setting?.hidden },
              })
            }
            onToggleLocked={() =>
              dispatch({
                type: 'SET_TRACK_SETTING',
                trackId: 'V2',
                setting: { locked: !v2Setting?.locked },
              })
            }
          />

          {/* V1 Header */}
          <TimelineTrackHeader
            label="V1"
            name="Primary Video"
            type="video"
            visible={!v1Setting?.hidden}
            locked={Boolean(v1Setting?.locked)}
            onToggleVisible={() =>
              dispatch({
                type: 'SET_TRACK_SETTING',
                trackId: 'V1',
                setting: { hidden: !v1Setting?.hidden },
              })
            }
            onToggleLocked={() =>
              dispatch({
                type: 'SET_TRACK_SETTING',
                trackId: 'V1',
                setting: { locked: !v1Setting?.locked },
              })
            }
          />

          {/* Dynamic Audio Headers for all audio tracks */}
          {audioTracks.map((track, idx) => {
            const setting = state.project.trackSettings?.[track.id];
            return (
              <TimelineTrackHeader
                key={track.id}
                label={`A${idx + 1}`}
                name={`${track.type.toUpperCase()}: ${track.id}`}
                type="audio"
                muted={Boolean(setting?.muted)}
                locked={Boolean(setting?.locked)}
                onToggleMuted={() =>
                  dispatch({
                    type: 'SET_TRACK_SETTING',
                    trackId: track.id,
                    setting: { muted: !setting?.muted },
                  })
                }
                onToggleLocked={() =>
                  dispatch({
                    type: 'SET_TRACK_SETTING',
                    trackId: track.id,
                    setting: { locked: !setting?.locked },
                  })
                }
              />
            );
          })}
        </div>

        {/* Right Scrollable Content (Ruler + Lanes + Playhead) */}
        <div
          ref={scrollContainerRef}
          style={{
            flex: 1,
            overflowX: 'auto',
            overflowY: 'hidden',
            position: 'relative',
            backgroundColor: 'var(--bg-app)',
          }}
        >
          {/* Ruler */}
          <TimelineRuler totalWidthPx={totalWidthPx} />

          {/* Tracks Lanes */}
          <div style={{ position: 'relative', width: `${totalWidthPx}px` }}>
            {/* V2 Lane: Overlays */}
            <TimelineTrack totalWidthPx={totalWidthPx}>
              {!v2Setting?.hidden &&
                overlayScenes.map((cs) => (
                  <TimelineClip
                    key={cs.scene.id}
                    scene={cs.scene}
                    startFrame={cs.startFrame}
                    durationInFrames={cs.durationInFrames}
                  />
                ))}
            </TimelineTrack>

            {/* V1 Lane: Primary Scenes */}
            <TimelineTrack totalWidthPx={totalWidthPx}>
              {!v1Setting?.hidden &&
                primaryScenes.map((cs) => (
                  <TimelineClip
                    key={cs.scene.id}
                    scene={cs.scene}
                    startFrame={cs.startFrame}
                    durationInFrames={cs.durationInFrames}
                  />
                ))}
            </TimelineTrack>

            {/* Audio Lanes for every track in audioTracks */}
            {audioTracks.map((track) => {
              const leftPx = framesToPixels(track.startFrame, fps, pps);
              const durationFrames =
                track.durationInFrames ?? Math.max(0, totalFrames - track.startFrame);
              const widthPx = Math.max(20, framesToPixels(durationFrames, fps, pps));
              const isSelected = state.selectedClipId === track.id;
              const isMuted = Boolean(state.project.trackSettings?.[track.id]?.muted);

              return (
                <TimelineTrack key={track.id} totalWidthPx={totalWidthPx}>
                  <div
                    onClick={() => dispatch({ type: 'SET_SELECTED_CLIP', clipId: track.id })}
                    style={{
                      position: 'absolute',
                      left: `${leftPx}px`,
                      width: `${widthPx}px`,
                      top: '8px',
                      bottom: '8px',
                      borderRadius: '4px',
                      backgroundColor: isSelected
                        ? 'rgba(53, 199, 138, 0.45)'
                        : isMuted
                        ? 'rgba(100, 116, 139, 0.25)'
                        : 'rgba(53, 199, 138, 0.2)',
                      border: isSelected
                        ? '2px solid #10B981'
                        : isMuted
                        ? '1px dashed #64748B'
                        : '1px solid rgba(53, 199, 138, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 8px',
                      fontSize: '11px',
                      color: isMuted ? '#94A3B8' : '#6EE7B7',
                      cursor: 'pointer',
                      userSelect: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {track.id} {isMuted ? '(MUTED)' : `(${durationFrames}f)`}
                  </div>
                </TimelineTrack>
              );
            })}

            {/* Playhead Overlay */}
            <TimelinePlayhead timelineHeight={tracksHeight + 28} />
          </div>
        </div>
      </div>
    </div>
  );
};
