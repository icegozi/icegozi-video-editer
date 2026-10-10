import React, { useState, useMemo, useRef } from 'react';
import { Type, Sigma, Video, Image, Music, Plus, Search, Trash2, Upload, FileText } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { PanelHeader } from '../shell/PanelHeader';
import { Input } from '../ui/Input';
import { IconButton } from '../ui/IconButton';
import { SceneConfig } from '../../../domain/video/Scene';
import { COLOR_TOKENS } from '../../tokens/colors';
import { generateId } from '../../../shared/utils/id';

type AssetFilter = 'all' | 'text' | 'formula' | 'video' | 'image' | 'audio';

export const AssetPanel: React.FC = () => {
  const { state, dispatch } = useEditor();
  const [filter, setFilter] = useState<AssetFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Predefined scene templates for quick addition
  const handleAddScene = (type: 'text' | 'formula') => {
    let newScene: SceneConfig;

    if (type === 'formula') {
      newScene = {
        id: generateId('scene-formula'),
        type: 'formula',
        durationInFrames: 90,
        latex: 'E = mc^2',
        title: 'Mass-Energy Equivalence',
        explanation: 'Energy equals mass times the speed of light squared.',
        fontSize: 64,
        textColor: '#7DD3FC',
        backgroundColor: '#0F172A',
      };
    } else {
      newScene = {
        id: generateId('scene-text'),
        type: 'text',
        durationInFrames: 90,
        title: 'NEW SCENE',
        subtitle: 'Enterprise Video Story',
        backgroundColor: '#0F172A',
        textColor: '#FFFFFF',
        animationType: 'fade',
      };
    }

    dispatch({ type: 'ADD_SCENE', scene: newScene });
  };

  // Real media file upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check for SRT subtitle files
    if (file.name.endsWith('.srt')) {
      const text = await file.text();
      // Simple parse SRT cues
      const cues: Array<{ id: string; startMs: number; endMs: number; text: string }> = [];
      const blocks = text.trim().split(/\r?\n\r?\n/);
      for (const block of blocks) {
        const lines = block.split(/\r?\n/);
        if (lines.length >= 2) {
          const timeLine = lines[1].includes('-->') ? lines[1] : lines[0];
          const textLine = lines.slice(lines.indexOf(timeLine) + 1).join(' ');
          const parts = timeLine.split('-->');
          if (parts.length === 2) {
            const parseMs = (ts: string) => {
              const [hms, ms] = ts.trim().replace(',', '.').split('.');
              const [h, m, s] = hms.split(':').map(Number);
              return (h * 3600 + m * 60 + s) * 1000 + (parseInt(ms || '0', 10));
            };
            cues.push({
              id: generateId('sub'),
              startMs: parseMs(parts[0]),
              endMs: parseMs(parts[1]),
              text: textLine.trim(),
            });
          }
        }
      }
      if (cues.length > 0) {
        dispatch({ type: 'SET_SUBTITLES', subtitles: cues });
      }
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        headers: {
          'x-file-name': encodeURIComponent(file.name),
        },
        body: file,
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed');
      }

      const assetUrl = data.url;

      if (file.type.startsWith('image/') || data.mediaType === 'image') {
        const imageScene: SceneConfig = {
          id: generateId('scene-image'),
          type: 'image',
          durationInFrames: 90,
          src: assetUrl,
          objectFit: 'cover',
        };
        dispatch({ type: 'ADD_SCENE', scene: imageScene });
      } else if (file.type.startsWith('audio/') || data.mediaType === 'audio') {
        dispatch({
          type: 'ADD_AUDIO_TRACK',
          track: {
            id: generateId('audio'),
            type: 'voice',
            src: assetUrl,
            startFrame: 0,
            durationInFrames: 120,
            volume: 1,
          },
        });
      } else {
        // Video file
        const videoScene: SceneConfig = {
          id: generateId('scene-video'),
          type: 'video',
          durationInFrames: 90,
          src: assetUrl,
          volume: 1,
          startFromFrame: 0,
          playbackRate: 1,
        };
        dispatch({ type: 'ADD_SCENE', scene: videoScene });
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Media upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const filteredScenes = useMemo(() => {
    return state.project.scenes.filter((scene) => {
      if (filter !== 'all' && scene.type !== filter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const title = (scene as any).title || (scene as any).src || (scene as any).latex || scene.id;
        return title.toLowerCase().includes(query) || scene.type.toLowerCase().includes(query);
      }
      return true;
    });
  }, [state.project.scenes, filter, searchQuery]);

  const getSceneIcon = (type: string) => {
    switch (type) {
      case 'formula':
        return <Sigma size={14} color={COLOR_TOKENS.tracks.formula.text} />;
      case 'text':
        return <Type size={14} color={COLOR_TOKENS.tracks.text.text} />;
      case 'video':
        return <Video size={14} color={COLOR_TOKENS.tracks.video.text} />;
      case 'image':
        return <Image size={14} color={COLOR_TOKENS.tracks.image.text} />;
      case 'audio':
        return <Music size={14} color={COLOR_TOKENS.tracks.audio.text} />;
      default:
        return <Type size={14} color="var(--text-secondary)" />;
    }
  };

  const getSceneDisplayName = (scene: SceneConfig) => {
    if (scene.type === 'text') return scene.title || 'Text Scene';
    if (scene.type === 'formula') return scene.title || scene.latex || 'Formula Scene';
    if (scene.type === 'video' || scene.type === 'image') return scene.src.split('/').pop() || scene.id;
    return scene.id;
  };

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*,audio/*,.srt"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      <PanelHeader
        title="Assets & Scenes"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <IconButton
              icon={<Upload size={13} />}
              label="Tải lên tệp đa phương tiện (Video, Image, Audio, SRT)"
              size="sm"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
            />
            <IconButton
              icon={<Sigma size={13} />}
              label="Thêm scene công thức toán học"
              size="sm"
              onClick={() => handleAddScene('formula')}
            />
            <IconButton
              icon={<Type size={13} />}
              label="Thêm scene văn bản"
              size="sm"
              onClick={() => handleAddScene('text')}
            />
          </div>
        }
      />

      {isUploading && (
        <div style={{ padding: '6px 12px', backgroundColor: 'var(--color-primary, #3568E8)', color: '#FFFFFF', fontSize: '11px', textAlign: 'center' }}>
          Đang tải lên và chuẩn hóa tệp đa phương tiện…
        </div>
      )}

      {/* Search Bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: '10px',
              color: 'var(--color-text-secondary, #52627A)',
              pointerEvents: 'none',
            }}
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm scenes & media…"
            style={{ paddingLeft: '30px', height: '28px', fontSize: '11px' }}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '6px 12px',
          borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)',
          backgroundColor: 'var(--color-surface-muted, #F2F5FA)',
          overflowX: 'auto',
        }}
      >
        {(['all', 'text', 'formula', 'video', 'image'] as AssetFilter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-controlSm, 6px)',
              border: filter === tab ? '1px solid var(--color-primary, #3568E8)' : '1px solid transparent',
              fontSize: '11px',
              fontWeight: 500,
              textTransform: 'capitalize',
              backgroundColor: filter === tab ? 'var(--color-primary-subtle, #EEF3FF)' : 'transparent',
              color: filter === tab ? 'var(--color-primary, #3568E8)' : 'var(--color-text-secondary, #52627A)',
              cursor: 'pointer',
              transition: 'background-color 100ms ease, color 100ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab === 'all' ? 'Tất cả' : tab}
          </button>
        ))}
      </div>

      {/* Asset Items List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {filteredScenes.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--color-text-secondary, #52627A)',
              fontSize: '12px',
            }}
          >
            Không tìm thấy scene phù hợp.
          </div>
        ) : (
          filteredScenes.map((scene) => {
            const isSelected = state.selectedClipId === scene.id;
            return (
              <div
                key={scene.id}
                onClick={() => dispatch({ type: 'SET_SELECTED_CLIP', clipId: scene.id })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-controlSm, 6px)',
                  backgroundColor: isSelected ? 'var(--color-primary-subtle, #EEF3FF)' : 'transparent',
                  border: isSelected ? '1px solid var(--color-primary, #3568E8)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'background-color 80ms ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: 'var(--radius-controlSm, 6px)',
                      backgroundColor: 'var(--color-surface, #FFFFFF)',
                      border: '1px solid var(--color-border-subtle, #E2E8F0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getSceneIcon(scene.type)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'var(--color-text-primary, #17233B)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getSceneDisplayName(scene)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)' }}>
                      {(scene.durationInFrames / state.project.fps).toFixed(1)}s ({scene.durationInFrames}f)
                    </div>
                  </div>
                </div>

                {state.project.scenes.length > 1 && (
                  <IconButton
                    icon={<Trash2 size={13} />}
                    label="Xóa scene khỏi timeline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'DELETE_SCENE', sceneId: scene.id });
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
