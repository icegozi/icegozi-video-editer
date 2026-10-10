import { useCallback, useEffect, useRef, useState } from 'react';
import { assistantRequest } from './useAssistant';
import { useEditor } from '../state/editorStore';
import {
  RegisteredAssetSchema,
  type GenerationOverview,
  type GenerationRequest,
  type GenerationPlan,
  type GenerationStatus,
  type RegisteredAsset,
} from '../../application/scene-generation/generation.contracts';
import type { AssistantConversation, ProjectSnapshot } from '../../application/assistant/assistant.contracts';
import type { GoogleConnectionStatus } from '../../application/scene-generation/generation.contracts';

export function useSceneGeneration(
  conversation: AssistantConversation | null,
  snapshot: () => ProjectSnapshot,
) {
  const { dispatch } = useEditor();
  const [overview, setOverview] = useState<GenerationOverview | null>(null);
  const [google, setGoogle] = useState<GoogleConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const owner = conversation
    ? { conversationId: conversation.id, epoch: conversation.epoch }
    : null;
  const ownerKey = owner ? `${owner.conversationId}:${owner.epoch}` : '';
  const current = useRef(ownerKey);
  const mounted = useRef(true);
  const live = useCallback((key: string) => mounted.current && current.current === key, []);
  const dataOwner = useRef('');
  const errorOwner = useRef('');
  current.current = ownerKey;
  const [preview, setPreview] = useState<{
    url: string;
    kind: 'image' | 'video';
    assetId: string;
  } | null>(null);
  const previewRef = useRef<string | null>(null);
  const revoke = useCallback(() => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = null;
    setPreview(null);
  }, []);
  useEffect(() => {
    setOverview(null);
    setGoogle(null);
    setError(null);
    revoke();
    if (!owner) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let manifestKey = '';
    const refresh = async () => {
      try {
        const [result, status] = await Promise.all([
          assistantRequest<GenerationOverview>('generation/overview', owner, controller.signal),
          assistantRequest<GoogleConnectionStatus>(
            'generation/google/status',
            owner,
            controller.signal,
          ),
        ]);
        if (controller.signal.aborted || !live(ownerKey)) return;
        dataOwner.current = ownerKey;
        setOverview(result);
        setGoogle(status);
        const nextKey = result.assets.map((asset) => `${asset.id}:${asset.hash}`).join('|');
        if (nextKey !== manifestKey) {
          manifestKey = nextKey;
          dispatch({
            type: 'SET_ASSET_MANIFEST',
            projectId: conversation!.projectId,
            epoch: owner.epoch,
            assets: result.assets.map((asset) => RegisteredAssetSchema.parse(asset)),
          });
        }
      } catch (failure) {
        if (!controller.signal.aborted && live(ownerKey)) {
          errorOwner.current = ownerKey;
          setError(failure instanceof Error ? failure.message : 'Không tải được tác vụ tạo cảnh.');
        }
      }
      if (!controller.signal.aborted) timer = setTimeout(() => void refresh(), 2500);
    };
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [ownerKey, dispatch, revoke, live]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);
  const operation = async <T>(
    task: (scope: { conversationId: string; epoch: string }) => Promise<T>,
  ): Promise<T | undefined> => {
    if (!owner || busyRef.current || !mounted.current) return;
    const key = ownerKey;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await task(owner);
      return live(key) ? result : undefined;
    } catch (failure) {
      if (live(key)) {
        errorOwner.current = key;
        setError(failure instanceof Error ? failure.message : 'Không hoàn tất tạo cảnh.');
      }
      return undefined;
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const create = (request: GenerationRequest) =>
    operation(async (scope) => {
      const plan = await assistantRequest<GenerationPlan>('generation/plan', {
        ...scope,
        request,
        snapshot: snapshot(),
      });
      if (!live(ownerKey)) return;
      await assistantRequest('generation/request', {
        ...scope,
        planId: plan.id,
      });
      const result = await assistantRequest<GenerationOverview>('generation/overview', scope);
      if (live(ownerKey)) setOverview(result);
      return plan;
    });
  const decide = (requestId: string, accept: boolean) =>
    operation(async (scope) => {
      const result = await assistantRequest<GenerationStatus>('generation/approve', {
        ...scope,
        requestId,
        accept,
      });
      if (live(ownerKey))
        setOverview((old) =>
          old
            ? {
                ...old,
                requests: old.requests.map((entry) =>
                  entry.requestId === requestId ? result : entry,
                ),
              }
            : old,
        );
    });
  const showAsset = (asset: RegisteredAsset) =>
    operation(async (scope) => {
      const capability = document.querySelector<HTMLMetaElement>(
        'meta[name="icegozi-capability"]',
      )?.content;
      const response = await fetch(
        `/api/codex/generation/result/${asset.id}?${new URLSearchParams(scope)}`,
        { headers: { 'X-Icegozi-Capability': capability ?? '' } },
      );
      if (!response.ok) throw new Error('Không xem được media của phiên này.');
      const blob = await response.blob();
      if (!live(ownerKey)) return;
      revoke();
      const url = URL.createObjectURL(blob);
      previewRef.current = url;
      setPreview({
        url,
        kind: asset.mediaType === 'video' ? 'video' : 'image',
        assetId: asset.id,
      });
    });
  const show = (entry: GenerationStatus) =>
    entry.asset
      ? showAsset(entry.asset)
      : operation(async () => {
          throw new Error('Media chưa sẵn sàng.');
        });
  const propose = (entry: GenerationStatus) =>
    operation(async (scope) => {
      if (!entry.asset) throw new Error('Media chưa sẵn sàng.');
      await assistantRequest('generation/propose', {
        ...scope,
        assetId: entry.asset.id,
        requestId: entry.requestId,
        snapshot: snapshot(),
      });
    });
  const importImage = (file: File) =>
    operation(async (scope) => {
      const context = await assistantRequest<AssistantConversation>('conversation', snapshot());
      if (context.id !== scope.conversationId || context.epoch !== scope.epoch || !live(ownerKey))
        return;
      const capability = document.querySelector<HTMLMetaElement>(
        'meta[name="icegozi-capability"]',
      )?.content;
      const response = await fetch(
        '/api/codex/generation/import-image?' + new URLSearchParams(scope),
        {
          method: 'POST',
          headers: {
            'X-Icegozi-Capability': capability ?? '',
            'Content-Type': file.type || 'application/octet-stream',
          },
          body: file,
        },
      );
      const asset = await response.json();
      if (!response.ok) throw new Error(asset.error ?? 'Không nhập được ảnh.');
      const value = RegisteredAssetSchema.parse(asset);
      const result = await assistantRequest<GenerationOverview>('generation/overview', scope);
      if (live(ownerKey)) setOverview(result);
      return value;
    });
  const googleAction = (
    action: 'configure' | 'login' | 'cancel' | 'disconnect',
    config?: unknown,
  ) =>
    operation(async (scope) => {
      const result = await assistantRequest<GoogleConnectionStatus>('generation/google/' + action, {
        ...scope,
        ...(config ? { config } : {}),
      });
      if (live(ownerKey)) setGoogle(result);
      return result;
    });
  return {
    overview: dataOwner.current === ownerKey ? overview : null,
    google: dataOwner.current === ownerKey ? google : null,
    error: errorOwner.current === ownerKey ? error : null,
    busy,
    create,
    decide,
    show,
    showAsset,
    propose,
    importImage,
    googleAction,
    preview: dataOwner.current === ownerKey ? preview : null,
    revoke,
    cancel: (requestId: string) =>
      operation((scope) => assistantRequest('generation/cancel', { ...scope, requestId })),
    retry: (requestId: string) =>
      operation((scope) => assistantRequest('generation/retry', { ...scope, requestId })),
  };
}
