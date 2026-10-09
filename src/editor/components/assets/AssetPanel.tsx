import React, { useState, useMemo } from 'react';
import { Type, Sigma, Video, Image, Music, Plus, Search, Trash2 } from 'lucide-react';
import { useEditor } from '../../state/editorStore';
import { PanelHeader } from '../shell/PanelHeader';
import { Input } from '../ui/Input';
import { IconButton } from '../ui/IconButton';
import { SceneConfig } from '../../../domain/video/Scene';
import { COLOR_TOKENS } from '../../tokens/colors';

type AssetFilter = 'all' | 'text' | 'formula' | 'video' | 'image' | 'audio';

export const AssetPanel: React.FC = () => {
  const { state, dispatch } = useEditor();
  const [filter, setFilter] = useState<AssetFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Predefined scene templates for quick addition
  const handleAddScene = (type: 'text' | 'formula' | 'video' | 'image') => {
    const timestamp = Date.now().toString().slice(-4);
    let newScene: SceneConfig;

    if (type === 'formula') {
      newScene = {
        id: `scene-formula-${timestamp}`,
        type: 'formula',
        durationInFrames: 90,
        latex: 'E = mc^2',
        title: 'Mass-Energy Equivalence',
        explanation: 'Energy equals mass times the speed of light squared.',
        fontSize: 64,
        textColor: '#7DD3FC',
        backgroundColor: '#0F172A',
      };
    } else if (type === 'video') {
      newScene = {
        id: `scene-video-${timestamp}`,
        type: 'video',
        durationInFrames: 90,
        src: 'assets/video/intro.mp4',
        volume: 1,
      };
    } else if (type === 'image') {
      newScene = {
        id: `scene-image-${timestamp}`,
        type: 'image',
        durationInFrames: 90,
        src: 'assets/images/background.png',
        objectFit: 'cover',
      };
    } else {
      newScene = {
        id: `scene-text-${timestamp}`,
        type: 'text',
        durationInFrames: 90,
        title: 'NEW SCENE',
        subtitle: 'Enterprise Subtitle',
        backgroundColor: '#0F172A',
        textColor: '#FFFFFF',
        animationType: 'fade',
      };
    }

    dispatch({
      type: 'UPDATE_PROJECT_METADATA',
      updates: {
        scenes: [...state.project.scenes, newScene],
      },
    });
    dispatch({ type: 'SET_SELECTED_CLIP', clipId: newScene.id });
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
        backgroundColor: 'var(--bg-panel)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <PanelHeader
        title="Assets & Scenes"
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <IconButton
              icon={<Sigma size={13} />}
              label="Add Formula Scene"
              size="sm"
              onClick={() => handleAddScene('formula')}
            />
            <IconButton
              icon={<Type size={13} />}
              label="Add Text Scene"
              size="sm"
              onClick={() => handleAddScene('text')}
            />
            <IconButton
              icon={<Plus size={14} />}
              label="Add Scene"
              size="sm"
              onClick={() => handleAddScene('text')}
            />
          </div>
        }
      />

      {/* Search Bar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: '10px',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter assets..."
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
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          overflowX: 'auto',
        }}
      >
        {(['all', 'text', 'formula', 'video', 'image'] as AssetFilter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              border: 'none',
              fontSize: '10px',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              backgroundColor: filter === tab ? 'var(--accent)' : 'transparent',
              color: filter === tab ? '#FFFFFF' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'background-color 100ms ease, color 100ms ease',
              whiteSpace: 'nowrap',
            }}
          >
            {tab}
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
              color: 'var(--text-muted)',
              fontSize: '11px',
            }}
          >
            No assets match current filter
          </div>
        ) : (
          filteredScenes.map((scene, index) => {
            const isSelected = state.selectedClipId === scene.id;
            const durationSec = (scene.durationInFrames / state.project.fps).toFixed(1);

            return (
              <div
                key={scene.id}
                onClick={() => dispatch({ type: 'SET_SELECTED_CLIP', clipId: scene.id })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  backgroundColor: isSelected ? 'var(--bg-active)' : 'transparent',
                  border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                  cursor: 'pointer',
                  transition: 'background-color 80ms ease, border-color 80ms ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: 'var(--bg-surface)',
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
                        fontSize: '11px',
                        fontWeight: 500,
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {getSceneDisplayName(scene)}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ textTransform: 'uppercase' }}>{scene.type}</span>
                      <span>•</span>
                      <span>
                        {durationSec}s ({scene.durationInFrames}f)
                      </span>
                    </div>
                  </div>
                </div>

                {state.project.scenes.length > 1 && (
                  <IconButton
                    icon={<Trash2 size={12} />}
                    label="Delete Scene"
                    size="sm"
                    style={{ opacity: 0.6 }}
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

      {/* Asset Panel Footer Status */}
      <div
        style={{
          padding: '6px 12px',
          borderTop: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-panel)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{state.project.scenes.length} Scenes in project</span>
        <span>{state.project.fps} FPS</span>
      </div>
    </aside>
  );
};
