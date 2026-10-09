import React, { useRef } from 'react';
import { useEditor } from '../../state/editorStore';
import { TimelineToolbar } from './TimelineToolbar';
import { TimelineRuler } from './TimelineRuler';
import { TimelineTrackHeader } from './TimelineTrackHeader';
import { TimelineTrack } from './TimelineTrack';
import { TimelineClip } from './TimelineClip';
import { TimelinePlayhead } from './TimelinePlayhead';
import { framesToPixels } from '../../geometry/timelineGeometry';

export const Timeline: React.FC = () => {
  const { state } = useEditor();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { fps } = state.project;
  const pps = state.zoomPixelsPerSecond;
  const totalFrames = state.timeline.totalDurationInFrames;

  // Calculate width with a generous buffer at the end
  const totalWidthPx = Math.max(1200, framesToPixels(totalFrames, fps, pps) + 300);

  // Divide scenes into V2 (Text & Formula overlays) and V1 (Primary video, images, or base scenes)
  // In our sequential model, all scenes are in computedScenes.
  // We can render text & formula on V2 or V1 according to type:
  const v2Scenes = state.timeline.computedScenes.filter(
    (cs) => cs.scene.type === 'text' || cs.scene.type === 'formula'
  );
  const v1Scenes = state.timeline.computedScenes.filter(
    (cs) => cs.scene.type !== 'text' && cs.scene.type !== 'formula'
  );

  // If there are no v1 scenes (like in math beauty demo where all scenes are text/formula),
  // we render them on V1 if V2 would be empty or split logically.
  const primaryScenes = v1Scenes.length > 0 ? v1Scenes : state.timeline.computedScenes;
  const overlayScenes = v1Scenes.length > 0 ? v2Scenes : [];

  const tracksHeight = 52 * 4; // 4 tracks * 52px = 208px

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

          {/* Track Headers */}
          <TimelineTrackHeader label="V2" name="Overlays / Text" type="video" />
          <TimelineTrackHeader label="V1" name="Primary Video" type="video" />
          <TimelineTrackHeader label="A1" name="Voice / Audio" type="audio" />
          <TimelineTrackHeader label="A2" name="BGM / SFX" type="audio" />
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
              {overlayScenes.map((cs) => (
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
              {primaryScenes.map((cs) => (
                <TimelineClip
                  key={cs.scene.id}
                  scene={cs.scene}
                  startFrame={cs.startFrame}
                  durationInFrames={cs.durationInFrames}
                />
              ))}
            </TimelineTrack>

            {/* A1 Lane: Audio 1 */}
            <TimelineTrack totalWidthPx={totalWidthPx}>
              {state.project.audioTracks && state.project.audioTracks[0] && (
                <div
                  style={{
                    position: 'absolute',
                    left: '0px',
                    width: `${framesToPixels(totalFrames, fps, pps)}px`,
                    top: '8px',
                    bottom: '8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(53, 199, 138, 0.2)',
                    border: '1px solid rgba(53, 199, 138, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 8px',
                    fontSize: '11px',
                    color: '#6EE7B7',
                  }}
                >
                  {state.project.audioTracks[0].id}
                </div>
              )}
            </TimelineTrack>

            {/* A2 Lane: Audio 2 */}
            <TimelineTrack totalWidthPx={totalWidthPx}>
              {state.project.audioTracks && state.project.audioTracks[1] && (
                <div
                  style={{
                    position: 'absolute',
                    left: '0px',
                    width: `${framesToPixels(totalFrames, fps, pps)}px`,
                    top: '8px',
                    bottom: '8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(53, 199, 138, 0.15)',
                    border: '1px solid rgba(53, 199, 138, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 8px',
                    fontSize: '11px',
                    color: '#6EE7B7',
                  }}
                >
                  {state.project.audioTracks[1].id}
                </div>
              )}
            </TimelineTrack>

            {/* Playhead Overlay */}
            <TimelinePlayhead timelineHeight={tracksHeight + 28} />
          </div>
        </div>
      </div>
    </div>
  );
};
