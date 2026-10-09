import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor } from '../state/editorStore';
import type { AssistantConversation, AssistantEvent, AssistantRender, AssistantStatus, ProjectProposal } from '../../shared/types/assistant';

export async function assistantRequest<T>(route: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const capability = document.querySelector<HTMLMetaElement>('meta[name="icegozi-capability"]')?.content;
  if (!capability) throw new Error('Bridge local không có trong bản frontend tĩnh. Chạy npm run dev.');
  const response = await fetch('/api/codex/' + route, {
    method: body === undefined ? 'GET' : 'POST', signal,
    headers: { 'X-Icegozi-Capability': capability, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? 'Bridge chưa sẵn sàng.');
  return result;
}

export function useAssistant() {
  const { state, dispatch } = useEditor();
  const stateRef = useRef(state);
  stateRef.current = state;
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [conversation, setConversation] = useState<AssistantConversation | null>(null);
  const [models, setModels] = useState<AssistantStatus['models']>([]);
  const [model, setModel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const identity = useRef('');
  const snapshot = useCallback(() => ({ project: stateRef.current.project, revision: stateRef.current.revision,
    selectedClipId: stateRef.current.selectedClipId, playhead: stateRef.current.currentFrame }), []);

  const refreshStatus = useCallback(async () => {
    const next = await assistantRequest<AssistantStatus>('status');
    setStatus(next);
  }, []);
  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      try { const next = await assistantRequest<AssistantStatus>('status'); if (!stopped) setStatus(next); }
      catch (err) { if (!stopped) setError(err instanceof Error ? err.message : 'Không kết nối được bridge.'); }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 2500);
    return () => { stopped = true; clearInterval(timer); };
  }, []);
  const profileId = status?.auth.profileId ?? 'disconnected';
  const sharing = status?.auth.sharing ?? false;
  const projectId = state.project.id;
  useEffect(() => {
    if (!status) return;
    const controller = new AbortController();
    const key = `${profileId}:${projectId}`;
    identity.current = key;
    setConversation(null);
    dispatch({ type: 'SET_ASSISTANT_SESSION', epoch: null });
    void assistantRequest<AssistantConversation>('conversation', snapshot(), controller.signal).then((view) => {
      if (!controller.signal.aborted) { setConversation(view); dispatch({ type: 'SET_ASSISTANT_SESSION', epoch: view.epoch }); }
    }).catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Không mở được hội thoại.'); });
    return () => controller.abort();
    // Status polling must not reopen the conversation on every tick.
  }, [profileId, projectId, !!status, dispatch, snapshot]);
  const refreshModels = useCallback(async () => {
    const result = await assistantRequest<{ models: AssistantStatus['models'] }>('models');
    setModels(result.models);
    setModel((current) => result.models.some((entry) => entry.slug === current) ? current : result.models[0]?.slug ?? '');
  }, []);
  useEffect(() => {
    setModels([]); setModel('');
    if (!sharing) return;
    const controller = new AbortController();
    void assistantRequest<{ models: AssistantStatus['models'] }>('models', undefined, controller.signal).then((result) => {
      if (!controller.signal.aborted) { setModels(result.models); setModel(result.models[0]?.slug ?? ''); }
    }).catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Không tải được catalog.'); });
    return () => controller.abort();
  }, [profileId, sharing]);

  const conversationId = conversation?.id;
  const epoch = conversation?.epoch;
  useEffect(() => {
    if (!conversationId || !epoch) return;
    const controller = new AbortController();
    let latest = -1;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const connect = async () => {
      try {
        const capability = document.querySelector<HTMLMetaElement>('meta[name="icegozi-capability"]')!.content;
        const query = new URLSearchParams({ conversationId, epoch });
        const response = await fetch('/api/codex/events?' + query, { headers: { 'X-Icegozi-Capability': capability, 'Last-Event-ID': String(Math.max(0, latest)) }, signal: controller.signal });
        if (!response.ok || !response.body) throw new Error('Stream bị ngắt. Đang đồng bộ lại…');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          if (buffer.length > 2 * 1024 * 1024) throw new Error('Stream quá lớn.');
          let boundary: number;
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
            const data = block.split('\n').find((line) => line.startsWith('data: '));
            if (!data) continue;
            const event = JSON.parse(data.slice(6)) as AssistantEvent;
            if (event.id <= latest || event.conversation.id !== conversationId || event.conversation.epoch !== epoch) continue;
            latest = event.id;
            setConversation(event.conversation);
          }
        }
      } catch (err) { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Mất stream.'); }
      if (!controller.signal.aborted) retry = setTimeout(() => void connect(), 1500);
    };
    void connect();
    return () => { controller.abort(); clearTimeout(retry); };
  }, [conversationId, epoch]);

  const run = useCallback(async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(null);
    try { await operation(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể hoàn tất.'); }
    finally { busyRef.current = false; setBusy(false); }
  }, []);
  const owner = () => {
    if (!conversation) throw new Error('Chưa có hội thoại.');
    return { conversationId: conversation.id, epoch: conversation.epoch };
  };
  const login = (newProfile = false) => run(async () => { await assistantRequest('login', { newProfile }); await refreshStatus(); });
  const logout = () => run(async () => {
    setConversation(null); dispatch({ type: 'SET_ASSISTANT_SESSION', epoch: null });
    await assistantRequest('logout', {}); await refreshStatus();
  });
  const send = (text: string) => run(async () => {
    await assistantRequest('turn', { ...owner(), requestId: crypto.randomUUID(), text, model, snapshot: snapshot() });
  });
  const apply = (proposal: ProjectProposal) => {
    dispatch({ type: 'APPLY_AI_PROJECT_CHANGE', proposal });
  };
  const dismiss = (proposal: ProjectProposal) => run(async () => { await assistantRequest('proposal/dismiss', { ...owner(), proposalId: proposal.id }); });
  const render = () => run(async () => {
    const result = await assistantRequest<AssistantRender>('render', { ...owner(), requestId: crypto.randomUUID(), snapshot: snapshot() });
    setConversation((current) => current && current.id === conversationId ? { ...current, renders: [...current.renders.filter((entry) => entry.id !== result.id), result] } : current);
  });
  useEffect(() => {
    if (!conversationId || !epoch) return;
    const renders = conversation?.renders.filter((entry) => entry.status === 'queued' || entry.status === 'rendering') ?? [];
    if (!renders.length) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      void Promise.all(renders.map((job) => assistantRequest<AssistantRender>('render/status', { conversationId, epoch, jobId: job.id }, controller.signal))).then((results) => {
        if (!controller.signal.aborted) setConversation((current) => current && current.id === conversationId ? { ...current, renders: current.renders.map((job) => results.find((entry) => entry.id === job.id) ?? job) } : current);
      }).catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Render thất bại.'); });
    }, 1500);
    return () => { controller.abort(); clearInterval(timer); };
  }, [conversationId, epoch, conversation?.renders.map((job) => `${job.id}:${job.status}`).join(',')]);
  const preview = (job: AssistantRender) => run(async () => {
    const capability = document.querySelector<HTMLMetaElement>('meta[name="icegozi-capability"]')!.content;
    const query = new URLSearchParams(owner());
    const response = await fetch(`${job.downloadUrl}?${query}`, { headers: { 'X-Icegozi-Capability': capability } });
    if (!response.ok) throw new Error('Preview chưa tồn tại hoặc phiên đã đổi.');
    const url = URL.createObjectURL(await response.blob());
    setPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return url; });
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => { setPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return null; }); }, [profileId, projectId]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  return { status, conversation, models, model, setModel, error, busy, run, login, logout, send, apply, dismiss, render, preview, previewUrl,
    applied: state.appliedAiProposalIds, applyError: state.assistantApplyError,
    cancelLogin: () => run(async () => { await assistantRequest('login/cancel', {}); await refreshStatus(); }),
    selectProfile: (profileId: string) => run(async () => { setConversation(null); dispatch({ type: 'SET_ASSISTANT_SESSION', epoch: null }); await assistantRequest('profile', { profileId }); await refreshStatus(); }),
    refreshModels: () => run(refreshModels),
    cancel: () => run(async () => { await assistantRequest('turn/cancel', owner()); }),
    approval: (approvalId: string, decision: 'accept' | 'decline' | 'cancel') => run(async () => { await assistantRequest('approval', { ...owner(), approvalId, decision }); }),
    cancelRender: (jobId: string) => run(async () => { await assistantRequest('render/cancel', { ...owner(), jobId }); }),
  };
}
