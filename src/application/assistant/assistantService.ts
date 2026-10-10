import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';
import type { ChatGPTClient } from '../../infrastructure/chatgpt/devkit/types';
import { JsonlClient, type RpcId, type RpcMessage } from '../../infrastructure/codex/jsonlClient';
import { startRuntime } from '../../infrastructure/codex/runtime';
import { AssistantError, safeAssistantError } from './errors';
import { projectAssets, projectFingerprint, validateCandidate, validateProposal } from './projectProposals';
import { SnapshotSchema, type ProjectSnapshot, type AssistantConversation, type AssistantEvent, type AssistantRender, type ProjectProposal } from './assistant.contracts';
import { ProposalSchema } from './assistant.contracts';
import { videoTools, EDITOR_TOOLSET_VERSION } from './editorTools';
import { editorCapabilities, videoAssistantInstructions, EditableProjectSchema } from './editorCapabilities';
import { listVideoSkills, readVideoSkill } from './videoSkills';
import type { SceneGenerationService } from '../scene-generation/sceneGenerationService';
import type { GenerationOwner } from '../scene-generation/generation.contracts';
import type { ProposalLease } from './assistant.contracts';
import { validateProjectSnapshot } from './projectSnapshot';
export { videoTools } from './editorTools';

export interface PreviewRenderer {
  create(project: unknown, profile?: 'preview' | 'final'): { id: string };
  status(id: string): { status: string; progress: number; outputReady: boolean } | null;
  cancel(id: string): boolean;
  missingAssets?(project: ProjectSnapshot['project']): string[];
}
interface Conversation {
  profileId: string;
  snapshot: ProjectSnapshot;
  view: AssistantConversation;
  threadId?: string;
  toolsetVersion?: string;
  turnId?: string;
  runtime?: JsonlClient;
  token?: string;
  events: AssistantEvent[];
  sequence: number;
  listeners: Set<(event: AssistantEvent) => void>;
  invocations: Map<string, Promise<unknown>>;
  requests: Set<string>;
  terminalTurns: Set<string>;
  pending: Map<string, { resolve: (accept: boolean) => void; timer: ReturnType<typeof setTimeout> }>;
  timer?: ReturnType<typeof setTimeout>;
  stopping?: Promise<void>;
}

export class AssistantService {
  private proposalLeases = new Map<string, { owner: string; proposalId: string; lease: ProposalLease }>();
  private appliedLeases = new Map<string, string>();
  private conversations = new Map<string, Conversation>();
  private generation = 0;
  private persistenceTimer?: ReturnType<typeof setTimeout>;
  constructor(private readonly auth: ChatGPTClient, private readonly renderer: PreviewRenderer,
    private readonly directory: string,
    private readonly launch: typeof startRuntime = startRuntime,
    private readonly persistence?: { read(): unknown; write(value: unknown): void },
    public readonly sceneGeneration?: SceneGenerationService) {
    sceneGeneration?.subscribe(() => {
      for (const conversation of this.conversations.values()) {
        conversation.view.generationVersion = (conversation.view.generationVersion ?? 0) + 1;
        this.emit(conversation);
      }
    });
    if (!persistence) return;
    try {
      const entries = z.array(z.object({ profileId: z.string(), snapshot: SnapshotSchema, threadId: z.string().optional(), toolsetVersion: z.string().max(100).optional(),
        view: z.object({ id: z.string().uuid(), epoch: z.string().uuid(), projectId: z.string(), status: z.enum(['idle', 'running', 'completed', 'failed', 'interrupted']),
          messages: z.array(z.object({ id: z.string(), role: z.enum(['user', 'assistant']), text: z.string().max(64000) })).max(200),
          proposals: z.array(ProposalSchema).max(20), renders: z.array(z.object({ id: z.string(), profile: z.enum(['preview', 'final']).optional(), requestId: z.string().optional(), projectId: z.string(), fingerprint: z.string(), status: z.string(), progress: z.number(), downloadUrl: z.string().nullable() })).max(20),
          approvals: z.array(z.object({ id: z.string(), tool: z.string(), description: z.string() })), progress: z.string(), error: z.string().nullable() }) })).max(24).parse(persistence.read());
      for (const entry of entries) {
        const view: AssistantConversation = { ...entry.view, epoch: randomUUID(), approvals: [], renders: entry.view.renders.map((r) => ({ ...r, downloadUrl: null })) };
        view.proposals = view.proposals.map((p) => ({ ...p, epoch: view.epoch }));
        if (view.status === 'running') { view.status = 'interrupted'; view.error = 'Server đã khởi động lại. Tác vụ cũ không tự phát lại.'; }
        this.conversations.set(view.id, { ...entry, snapshot: validateProjectSnapshot(entry.snapshot), view, events: [], sequence: 0, listeners: new Set(), invocations: new Map(), requests: new Set(view.messages.filter((m) => m.role === 'user').map((m) => m.id)), terminalTurns: new Set(), pending: new Map() });
      }
    } catch { this.conversations.clear(); }
  }
  private persist(): void {
    if (!this.persistence) return;
    try { this.persistence.write([...this.conversations.values()].map(({ profileId, snapshot, threadId, toolsetVersion, view }) => ({ profileId, snapshot, threadId, toolsetVersion, view }))); }
    catch { for (const conversation of this.conversations.values()) conversation.view.error = 'Không lưu được lịch sử local. Giữ tab mở và kiểm tra dung lượng/quyền thư mục app data.'; }
  }

  async open(raw: unknown): Promise<AssistantConversation> {
    const snapshot = validateProjectSnapshot(raw);
    const auth = await this.auth.getSession();
    const profileId = auth.profileId ?? 'disconnected';
    let conversation = [...this.conversations.values()].find((entry) => entry.profileId === profileId && entry.view.projectId === snapshot.project.id);
    if (!conversation) {
      if (this.conversations.size >= 24) throw new AssistantError('sessions_full', 'Đã đạt giới hạn hội thoại. Đăng xuất để giải phóng phiên.');
      conversation = {
        profileId, snapshot,
        view: { id: randomUUID(), epoch: randomUUID(), projectId: snapshot.project.id, status: 'idle', messages: [], proposals: [], renders: [], approvals: [], progress: '', error: null },
        events: [], sequence: 0, listeners: new Set(), invocations: new Map(), requests: new Set(), terminalTurns: new Set(), pending: new Map(),
      };
      this.conversations.set(conversation.view.id, conversation);
    }
    if (conversation.view.status !== 'running') conversation.snapshot = snapshot;
    return structuredClone(conversation.view);
  }
  private async owned(id: string, epoch: string): Promise<Conversation> {
    const conversation = this.conversations.get(id);
    const auth = await this.auth.getSession();
    if (!conversation || conversation.view.epoch !== epoch || conversation.profileId !== (auth.profileId ?? 'disconnected')) {
      throw new AssistantError('session_changed', 'Phiên hoặc project đã thay đổi. Mở lại panel AI.', 409);
    }
    return conversation;
  }
  private assertCurrent(conversation: Conversation, epoch: string): void {
    if (this.conversations.get(conversation.view.id) !== conversation || conversation.view.epoch !== epoch) {
      throw new AssistantError('session_changed', 'Phiên đã thay đổi trong lúc xử lý.', 409);
    }
  }
  private emit(conversation: Conversation): void {
    if (conversation.view.status === 'running') {
      clearTimeout(this.persistenceTimer);
      this.persistenceTimer = setTimeout(() => this.persist(), 500);
    } else { clearTimeout(this.persistenceTimer); this.persist(); }
    const event: AssistantEvent = { id: ++conversation.sequence, conversation: structuredClone(conversation.view) };
    conversation.events.push(event);
    // Replay holds snapshots rather than deltas; any reconnect can resynchronize safely.
    conversation.events = conversation.events.slice(-4);
    for (const listener of conversation.listeners) {
      try { listener(event); }
      catch { conversation.listeners.delete(listener); }
    }
  }
  async subscribe(id: string, epoch: string, after: number, receive: (event: AssistantEvent) => void): Promise<() => void> {
    const conversation = await this.owned(id, epoch);
    this.assertCurrent(conversation, epoch);
    const latest = conversation.events.at(-1);
    if (!latest) receive({ id: conversation.sequence, conversation: structuredClone(conversation.view) });
    else if (after < latest.id) receive(structuredClone(latest));
    conversation.listeners.add(receive);
    return () => conversation.listeners.delete(receive);
  }
  async send(id: string, epoch: string, requestId: string, text: string, model: string, rawSnapshot: unknown): Promise<AssistantConversation> {
    const conversation = await this.owned(id, epoch);
    this.assertCurrent(conversation, epoch);
    if (conversation.requests.has(requestId)) return structuredClone(conversation.view);
    if (conversation.view.status === 'running') throw new AssistantError('turn_busy', 'Có tác vụ đang chạy. Dừng hoặc chờ hoàn tất.', 409);
    if (conversation.requests.size >= 200 || conversation.view.messages.length >= 200) throw new AssistantError('history_full', 'Hội thoại đã đạt giới hạn. Đăng xuất để bắt đầu phiên mới.');
    const snapshot = validateProjectSnapshot(rawSnapshot);
    if (snapshot.project.id !== conversation.view.projectId) throw new AssistantError('project_changed', 'Project đã thay đổi.', 409);
    const generation = this.generation;
    conversation.requests.add(requestId);
    conversation.snapshot = snapshot;
    conversation.view.status = 'running';
    conversation.view.error = null;
    conversation.view.progress = 'Đang kết nối Codex…';
    conversation.view.messages.push({ id: requestId, role: 'user', text });
    this.emit(conversation);
    try {
      const models = await this.auth.listModels();
      if (!models.some((entry) => entry.slug === model)) throw new AssistantError('model_not_found', 'Model chưa được catalog của phiên cho phép. Tải lại danh sách.');
      const credential = await this.auth.getRuntimeCredential();
      if (generation !== this.generation || credential.profileId !== conversation.profileId || conversation.view.status !== 'running') throw new AssistantError('session_changed', 'Phiên đã thay đổi.', 409);
      const toolsChanged = conversation.toolsetVersion !== EDITOR_TOOLSET_VERSION;
      if (conversation.token !== credential.accessToken || !conversation.runtime || toolsChanged) {
        await conversation.stopping;
        const previousRuntime = conversation.runtime;
        conversation.runtime = undefined;
        await previousRuntime?.stop();
        // Resume restores persisted tools; a new toolset needs a fresh native thread.
        if (toolsChanged) conversation.threadId = undefined;
        const runtimeDirectory = path.join(this.directory, 'runtime', conversation.profileId, conversation.view.id);
        const runtime = await this.launch(credential.accessToken, runtimeDirectory);
        if (generation !== this.generation || conversation.view.status !== 'running') { runtime.dispose(); throw new AssistantError('session_changed', 'Phiên đã thay đổi.', 409); }
        conversation.runtime = runtime;
        conversation.token = credential.accessToken;
        runtime.onNotification = (message) => this.notification(conversation, message);
        runtime.onServerRequest = (message) => { void this.serverRequest(conversation, message); };
        runtime.onClose = () => {
          if (conversation.runtime !== runtime) return;
          conversation.runtime = undefined;
          conversation.token = undefined;
          if (conversation.view.status === 'running') this.finish(conversation, 'failed', 'Runtime đã đóng/crash. Draft được giữ; tác vụ không tự phát lại.');
        };
        const params = {
          model, modelProvider: 'openai_chatgpt_plan', cwd: runtimeDirectory,
          sandbox: 'read-only', approvalPolicy: 'on-request', environments: [], selectedCapabilityRoots: [], dynamicTools: videoTools,
          developerInstructions: videoAssistantInstructions(),
        };
        let result: { thread?: { id?: string; status?: { type?: string } } };
        try {
          result = await runtime.request(conversation.threadId ? 'thread/resume' : 'thread/start', conversation.threadId ? {
            threadId: conversation.threadId, model, modelProvider: params.modelProvider, cwd: params.cwd,
            sandbox: params.sandbox, approvalPolicy: params.approvalPolicy, developerInstructions: params.developerInstructions,
          } : params) as typeof result;
        } catch (error) {
          if (conversation.threadId) {
            conversation.threadId = undefined;
            conversation.runtime = undefined;
            conversation.token = undefined;
            conversation.stopping = runtime.stop();
            await conversation.stopping;
            throw new AssistantError('thread_resume_failed', 'Chưa khôi phục được thread cũ. Chat/draft được giữ. Gửi lại chủ động sẽ tạo thread mới.');
          }
          throw error;
        }
        if (!result.thread?.id) throw new AssistantError('runtime_protocol', 'Runtime trả contract không tương thích.');
        if (result.thread.status?.type === 'active') {
          conversation.runtime = undefined; conversation.token = undefined;
          conversation.stopping = runtime.stop(); await conversation.stopping;
          throw new AssistantError('runtime_turn_busy', 'Thread runtime còn tác vụ đang chạy. Đã dừng process; hãy chủ động thử lại.', 409);
        }
        conversation.threadId = result.thread.id;
        conversation.toolsetVersion = EDITOR_TOOLSET_VERSION;
      }
      if (generation !== this.generation || conversation.view.status !== 'running') throw new AssistantError('session_changed', 'Phiên đã thay đổi.', 409);
      for (const key of conversation.invocations.keys()) if (!key.startsWith('render:')) conversation.invocations.delete(key);
      conversation.turnId = undefined;
      const result = await conversation.runtime!.request('turn/start', {
        threadId: conversation.threadId, model, clientUserMessageId: requestId,
        input: [{ type: 'text', text, text_elements: [] }],
      }) as { turn?: { id?: string } };
      if (!result.turn?.id) throw new AssistantError('runtime_protocol', 'Runtime không trả turn ID.');
      conversation.turnId = result.turn.id;
      if (conversation.view.status === 'running') {
        conversation.view.progress = 'Đang xử lý…';
        conversation.timer = setTimeout(() => { void this.cancel(id, epoch); }, 15 * 60_000);
        this.emit(conversation);
      }
    } catch (error) {
      if (generation === this.generation && conversation.view.status === 'running') this.finish(conversation, 'failed', safeAssistantError(error).message);
    }
    return structuredClone(conversation.view);
  }
  private notification(conversation: Conversation, message: RpcMessage): void {
    if (conversation.view.status !== 'running') return;
    const params = message.params as Record<string, unknown> | undefined;
    if (!params || params.threadId !== conversation.threadId) return;
    const notificationTurn = typeof params.turnId === 'string' ? params.turnId : undefined;
    if (notificationTurn && conversation.terminalTurns.has(notificationTurn)) return;
    if (conversation.turnId && notificationTurn && notificationTurn !== conversation.turnId) return;
    if (message.method === 'item/agentMessage/delta' && typeof params.delta === 'string' && typeof params.itemId === 'string') {
      let item = conversation.view.messages.find((m) => m.id === params.itemId);
      if (!item) { item = { id: params.itemId, role: 'assistant', text: '' }; conversation.view.messages.push(item); }
      if (item.text.length + params.delta.length > 64_000 || conversation.view.messages.reduce((sum, m) => sum + m.text.length, 0) + params.delta.length > 128_000 || conversation.view.messages.length > 200) { void this.cancel(conversation.view.id, conversation.view.epoch); return; }
      item.text += params.delta;
      this.emit(conversation);
    } else if (message.method === 'turn/completed') {
      const turn = params.turn as { id?: string; status?: string; error?: { codexErrorInfo?: unknown } } | undefined;
      if (!turn || !turn.id || conversation.terminalTurns.has(turn.id) || (conversation.turnId && turn.id !== conversation.turnId)) return;
      conversation.turnId = turn.id;
      if (turn.status === 'completed') this.finish(conversation, 'completed');
      else this.finish(conversation, turn.status === 'interrupted' ? 'interrupted' : 'failed', turn.status === 'interrupted' ? null : turn.error?.codexErrorInfo === 'usageLimitExceeded' ? 'Đã hết hạn mức ChatGPT. Giữ draft và xem Quản lý usage.' : 'Tác vụ thất bại. Kiểm tra quyền/model/usage trong ChatGPT rồi thử lại.');
    } else if (message.method === 'error') {
      conversation.view.error = 'Runtime báo lỗi. Kiểm tra mạng, phiên và hạn mức trong ChatGPT.';
      this.emit(conversation);
    }
  }
  private finish(conversation: Conversation, status: AssistantConversation['status'], error: string | null = null): void {
    if (conversation.turnId) conversation.terminalTurns.add(conversation.turnId);
    clearTimeout(conversation.timer);
    conversation.timer = undefined;
    conversation.view.status = status;
    conversation.view.error = error;
    conversation.view.progress = status === 'completed' ? 'Hoàn tất suy luận' : status === 'interrupted' ? 'Đã dừng' : 'Không hoàn tất';
    for (const entry of conversation.pending.values()) { clearTimeout(entry.timer); entry.resolve(false); }
    conversation.pending.clear();
    conversation.view.approvals = [];
    this.emit(conversation);
  }
  private async serverRequest(conversation: Conversation, message: RpcMessage): Promise<void> {
    const runtime = conversation.runtime;
    if (!runtime || message.id === undefined) return;
    try {
      if (message.method !== 'item/tool/call') {
        if (message.method === 'item/commandExecution/requestApproval' || message.method === 'item/fileChange/requestApproval') runtime.respond(message.id, { decision: 'decline' });
        else if (message.method === 'item/permissions/requestApproval') runtime.respond(message.id, { permissions: {}, scope: 'turn' });
        else if (message.method === 'execCommandApproval' || message.method === 'applyPatchApproval') runtime.respond(message.id, { decision: 'denied' });
        else runtime.rejectRequest(message.id);
        conversation.view.progress = 'Yêu cầu ngoài allowlist đã bị từ chối; chỉ công cụ video local được phép.';
        this.emit(conversation);
        return;
      }
      const params = z.object({ threadId: z.string(), turnId: z.string(), callId: z.string(), namespace: z.string().nullable().optional(), tool: z.string(), arguments: z.unknown() }).parse(message.params);
      if (params.threadId !== conversation.threadId || conversation.terminalTurns.has(params.turnId) || (conversation.turnId && params.turnId !== conversation.turnId) || conversation.view.status !== 'running' || params.namespace !== 'video_editor') {
        runtime.rejectRequest(message.id); return;
      }
      conversation.turnId ??= params.turnId;
      let result = conversation.invocations.get(params.callId);
      if (!result) {
        if (conversation.invocations.size >= 128) throw new AssistantError('tools_limit', 'Tác vụ gọi quá nhiều công cụ.');
        result = this.tool(conversation, params.tool, params.arguments, message.id);
        conversation.invocations.set(params.callId, result);
      }
      const output = await result;
      if (conversation.runtime !== runtime) return;
      runtime.respond(message.id, { success: true, contentItems: [{ type: 'inputText', text: JSON.stringify(output) }] });
    } catch (error) {
      try { runtime.respond(message.id, { success: false, contentItems: [{ type: 'inputText', text: safeAssistantError(error).message }] }); }
      catch { this.finish(conversation, 'failed', 'Runtime đã mất kết nối.'); }
    }
  }
  private async tool(conversation: Conversation, name: string, input: unknown, rpcId: RpcId): Promise<unknown> {
    const epoch = conversation.view.epoch;
    const turnId = conversation.turnId;
    const toolSnapshot = conversation.snapshot;
    const active = () => {
      this.assertCurrent(conversation, epoch);
      if (conversation.view.status !== 'running' || conversation.turnId !== turnId || conversation.snapshot !== toolSnapshot) throw new AssistantError('turn_changed', 'Tác vụ đã đổi hoặc dừng.', 409);
    };
    await this.owned(conversation.view.id, epoch);
    active();
    conversation.view.progress = `Công cụ: ${name}`;
    this.emit(conversation);
    if (name === 'get_editor_capabilities') { z.object({}).strict().parse(input); return editorCapabilities(this.sceneGeneration ? await this.sceneGeneration.capabilities(this.generationOwner(conversation)) : undefined); }
    if (['get_scene_generation_capabilities', 'list_scene_templates', 'plan_scene_generation', 'request_scene_generation', 'get_scene_generation_status', 'cancel_scene_generation', 'list_registered_assets'].includes(name)) {
      return this.generationOperation(conversation.view.id, epoch, name, input, undefined, turnId);
    }
    if (name === 'list_video_skills') { z.object({}).strict().parse(input); return listVideoSkills(); }
    if (name === 'read_video_skill') {
      const { skillId } = z.object({ skillId: z.string().max(64) }).strict().parse(input);
      return readVideoSkill(skillId);
    }
    if (name === 'get_project_context') {
      z.object({}).strict().parse(input);
      const { metadata: _metadata, ...project } = conversation.snapshot.project;
      return { ...conversation.snapshot, project, fingerprint: projectFingerprint(conversation.snapshot.project), projectId: project.id, assets: projectAssets(project),
        assetManifest: this.sceneGeneration ? await this.sceneGeneration.assets(this.generationOwner(conversation)) : [], missingAssets: this.renderer.missingAssets?.(project) ?? [],
        recentMessages: conversation.view.messages.slice(-8).map(({ role, text }) => ({ role, text: text.slice(0, 2000) })) };
    }
    if (name === 'list_project_assets') { z.object({}).strict().parse(input); return projectAssets(conversation.snapshot.project); }
    if (name === 'validate_project_change') {
      const { candidate } = z.object({ candidate: z.record(z.string(), z.unknown()) }).strict().parse(input);
      try {
        const editable = EditableProjectSchema.parse({ ...candidate, metadata: toolSnapshot.project.metadata });
        const validated = validateCandidate(toolSnapshot.project, editable,
          this.sceneGeneration ? await this.sceneGeneration.assetPolicy(this.generationOwner(conversation), projectAssets(editable)) : undefined);
        active();
        validateProjectSnapshot({ ...conversation.snapshot, project: validated });
        return { valid: true };
      } catch (error) {
        return { valid: false, errors: error instanceof z.ZodError
          ? error.issues.slice(0, 20).map((issue) => ({ path: issue.path, message: issue.message }))
          : [{ path: [], message: error instanceof Error ? error.message : 'Candidate không hợp lệ.' }] };
      }
    }
    if (name === 'propose_project_change') {
      const proposalInput = z.object({ summary: z.string().min(1).max(2000), candidate: z.record(z.string(), z.unknown()) }).strict().parse(input);
      const editable = EditableProjectSchema.parse({ ...proposalInput.candidate, metadata: toolSnapshot.project.metadata });
      const candidate = validateCandidate(toolSnapshot.project, editable,
        this.sceneGeneration ? await this.sceneGeneration.assetPolicy(this.generationOwner(conversation), projectAssets(editable)) : undefined);
      active();
      validateProjectSnapshot({ ...conversation.snapshot, project: candidate });
      if (conversation.view.proposals.length >= 4) throw new AssistantError('proposal_limit', 'Quá nhiều proposal. Áp dụng hoặc bỏ qua proposal cũ.');
      const proposal: ProjectProposal = {
        id: randomUUID(), epoch: conversation.view.epoch, projectId: candidate.id, baseRevision: conversation.snapshot.revision,
        fingerprint: projectFingerprint(conversation.snapshot.project), summary: proposalInput.summary,
        candidate, warnings: (this.renderer.missingAssets?.(candidate) ?? []).map((key) => `Thiếu media: ${key}`),
        affected: [...new Set([
          ...candidate.scenes.filter((s, i) => JSON.stringify(s) !== JSON.stringify(conversation.snapshot.project.scenes[i])).map((s) => s.id),
          ...conversation.snapshot.project.scenes.filter((s) => !candidate.scenes.some((next) => next.id === s.id)).map((s) => s.id),
          ...(JSON.stringify(candidate.audioTracks) !== JSON.stringify(conversation.snapshot.project.audioTracks) ? ['audio'] : []),
          ...(JSON.stringify(candidate.subtitles) !== JSON.stringify(conversation.snapshot.project.subtitles) ? ['subtitles'] : []),
        ])],
      };
      conversation.view.proposals.push(proposal);
      this.emit(conversation);
      return { proposalId: proposal.id, status: 'pending_user_review', summary: proposal.summary };
    }
    if (name === 'get_render_status') {
      const { jobId } = z.object({ jobId: z.string() }).strict().parse(input);
      return this.renderStatus(conversation, jobId);
    }
    if (name === 'render_project_preview' || name === 'render_project') {
      const profile = name === 'render_project'
        ? z.object({ profile: z.enum(['preview', 'final']) }).strict().parse(input).profile
        : (z.object({}).strict().parse(input), 'preview' as const);
      const id = String(rpcId);
      const accepted = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => { conversation.pending.delete(id); conversation.view.approvals = conversation.view.approvals.filter((entry) => entry.id !== id); resolve(false); this.emit(conversation); }, 5 * 60_000);
        conversation.pending.set(id, { resolve, timer });
        conversation.view.approvals.push({ id, tool: name, description: `Render ${profile} project ${conversation.view.projectId}, revision ${conversation.snapshot.revision}. Tạo file MP4 mới; không sửa media gốc.` });
        this.emit(conversation);
      });
      if (!accepted || conversation.view.status !== 'running') throw new AssistantError('declined', 'Render chưa được duyệt hoặc tác vụ đã dừng.');
      await this.owned(conversation.view.id, epoch);
      active();
      return this.createRender(conversation, undefined, profile);
    }
    throw new AssistantError('tool_forbidden', 'Công cụ không thuộc allowlist.');
  }
  async approval(id: string, epoch: string, approvalId: string, decision: 'accept' | 'decline' | 'cancel'): Promise<void> {
    const conversation = await this.owned(id, epoch);
    this.assertCurrent(conversation, epoch);
    const pending = conversation.pending.get(approvalId);
    if (!pending || conversation.view.status !== 'running') throw new AssistantError('approval_expired', 'Approval đã hết hạn hoặc đã xử lý.', 409);
    conversation.pending.delete(approvalId);
    clearTimeout(pending.timer);
    conversation.view.approvals = conversation.view.approvals.filter((entry) => entry.id !== approvalId);
    pending.resolve(decision === 'accept');
    this.emit(conversation);
    if (decision === 'cancel') await this.cancel(id, epoch);
  }
  private createRender(conversation: Conversation, requestId?: string, profile: 'preview' | 'final' = 'preview'): AssistantRender {
    if (conversation.view.renders.length >= 20) throw new AssistantError('render_limit', 'Đã đạt giới hạn render cho hội thoại.');
    const project = structuredClone(conversation.snapshot.project);
    const job = profile === 'preview' ? this.renderer.create(project) : this.renderer.create(project, profile);
    const result: AssistantRender = { id: job.id, profile, ...(requestId ? { requestId } : {}), projectId: conversation.view.projectId, fingerprint: projectFingerprint(conversation.snapshot.project), status: 'queued', progress: 0, downloadUrl: null };
    conversation.view.renders.push(result);
    this.emit(conversation);
    return result;
  }
  async render(id: string, epoch: string, requestId: string, snapshot: unknown): Promise<AssistantRender> {
    const conversation = await this.owned(id, epoch);
    this.assertCurrent(conversation, epoch);
    const key = `render:${requestId}`;
    const saved = conversation.view.renders.find((entry) => entry.requestId === requestId);
    if (saved) return structuredClone(saved);
    const existing = conversation.invocations.get(key);
    if (existing) return existing as Promise<AssistantRender>;
    if (conversation.view.status === 'running') throw new AssistantError('turn_busy', 'Chờ/dừng tác vụ trước khi render snapshot mới.', 409);
    const validated = validateProjectSnapshot(snapshot);
    if (validated.project.id !== conversation.view.projectId) throw new AssistantError('project_changed', 'Project đã đổi.', 409);
    if (conversation.view.renders.length >= 20) throw new AssistantError('render_limit', 'Đã đạt giới hạn preview cho hội thoại.');
    conversation.snapshot = validated;
    const result = this.createRender(conversation, requestId);
    conversation.invocations.set(key, Promise.resolve(result));
    return result;
  }
  private renderStatus(conversation: Conversation, jobId: string): AssistantRender {
    const render = conversation.view.renders.find((entry) => entry.id === jobId);
    if (!render) throw new AssistantError('render_owner', 'Job không thuộc hội thoại này.', 403);
    const job = this.renderer.status(jobId);
    if (!job) throw new AssistantError('render_missing', 'Không tìm thấy job.', 404);
    render.status = job.status;
    render.progress = job.progress;
    render.downloadUrl = job.status === 'completed' && job.outputReady ? `/api/codex/preview/${jobId}` : null;
    return structuredClone(render);
  }
  async previewStatus(id: string, epoch: string, jobId: string): Promise<AssistantRender> { return this.renderStatus(await this.owned(id, epoch), jobId); }
  async cancelRender(id: string, epoch: string, jobId: string): Promise<void> { const conversation = await this.owned(id, epoch); this.renderStatus(conversation, jobId); this.renderer.cancel(jobId); }
  async dismiss(id: string, epoch: string, proposalId: string): Promise<void> {
    const conversation = await this.owned(id, epoch);
    this.assertCurrent(conversation, epoch);
    const reservation = this.proposalLeases.get(`${id}:${proposalId}`);
    if (reservation && reservation.lease.expiresAt > Date.now()) throw new AssistantError('proposal_reserved', 'Có tab đang áp dụng bản nháp này.', 409);
    conversation.view.proposals = conversation.view.proposals.filter((entry) => entry.id !== proposalId);
    this.emit(conversation);
  }
  private generationOwner(conversation: Conversation): GenerationOwner {
    return { profileId: conversation.profileId, conversationId: conversation.view.id, epoch: conversation.view.epoch, projectId: conversation.view.projectId };
  }
  async ensureGenerationOwner(owner: GenerationOwner): Promise<void> {
    const conversation = await this.owned(owner.conversationId, owner.epoch);
    this.assertCurrent(conversation, owner.epoch);
    if (conversation.view.projectId !== owner.projectId || conversation.profileId !== owner.profileId) throw new AssistantError('owner_changed', 'Dự án hoặc tài khoản đã thay đổi.', 409);
    if (owner.turnId && (conversation.view.status !== 'running' || conversation.turnId !== owner.turnId)) throw new AssistantError('turn_changed', 'Tác vụ LLM đã dừng hoặc thay đổi.', 409);
  }
  async generationContext(id: string, epoch: string, rawSnapshot?: unknown) {
    const conversation = await this.owned(id, epoch); this.assertCurrent(conversation, epoch);
    if (rawSnapshot !== undefined) {
      if (conversation.view.status === 'running') throw new AssistantError('turn_busy', 'Chờ hoặc dừng LLM trước khi dựng từ snapshot mới.', 409);
      const snapshot = validateProjectSnapshot(rawSnapshot);
      if (snapshot.project.id !== conversation.view.projectId) throw new AssistantError('project_changed', 'Dự án đã thay đổi.', 409);
      conversation.snapshot = snapshot;
    }
    return { owner: this.generationOwner(conversation), snapshot: structuredClone(conversation.snapshot) };
  }
  async generationOperation(id: string, epoch: string, name: string, input: unknown, snapshot?: unknown, turnId?: string): Promise<unknown> {
    if (!this.sceneGeneration) throw new AssistantError('generation_unavailable', 'Core tạo cảnh chưa được khởi tạo.');
    const context = await this.generationContext(id, epoch, snapshot);
    if (turnId) context.owner.turnId = turnId;
    if (name === 'get_scene_generation_capabilities') { z.object({}).strict().parse(input); return this.sceneGeneration.capabilities(context.owner); }
    if (name === 'list_scene_templates') { z.object({}).strict().parse(input); return this.sceneGeneration.templates(); }
    if (name === 'list_registered_assets') { z.object({}).strict().parse(input); return this.sceneGeneration.assets(context.owner); }
    if (name === 'plan_scene_generation') return this.sceneGeneration.plan(context.owner, context.snapshot, input);
    if (name === 'request_scene_generation') { const { planId } = z.object({ planId: z.string().uuid() }).strict().parse(input); return this.sceneGeneration.request(context.owner, planId); }
    const { requestId } = z.object({ requestId: z.string().uuid() }).strict().parse(input);
    if (name === 'get_scene_generation_status') return this.sceneGeneration.status(context.owner, requestId);
    if (name === 'cancel_scene_generation') { await this.sceneGeneration.cancel(context.owner, requestId); return { requestId, status: 'cancel_requested' }; }
    throw new AssistantError('tool_forbidden', 'Công cụ không thuộc allowlist.');
  }
  async generatedSceneProposal(id: string, epoch: string, assetId: string, requestId: string, rawSnapshot: unknown): Promise<ProjectProposal> {
    if (!this.sceneGeneration) throw new AssistantError('generation_unavailable', 'Core tạo cảnh chưa được khởi tạo.');
    const context = await this.generationContext(id, epoch, rawSnapshot);
    const status = await this.sceneGeneration.status(context.owner, requestId);
    const { asset } = await this.sceneGeneration.resultFile(context.owner, assetId);
    if (status.job?.status !== 'ready' || status.asset?.id !== assetId) throw new AssistantError('asset_not_ready', 'Cảnh chưa có media đã kiểm tra.');
    const base = context.snapshot.project; const intent = status.plan.request.intent;
    const seconds = intent.timelineDurationSeconds ?? (asset.mediaType === 'video' ? asset.metadata.durationInSeconds : 5);
    const frames = Math.max(1, Math.round(seconds * base.fps));
    if (asset.mediaType === 'video' && frames / base.fps > asset.metadata.durationInSeconds + 0.5 / base.fps) throw new AssistantError('media_duration', 'Thời lượng cảnh vượt clip đã tạo.');
    const scene = asset.mediaType === 'video' ? { id: randomUUID(), type: 'video' as const, durationInFrames: frames, src: asset.storageKey, objectFit: intent.objectFit, volume: 0, playbackRate: 1, startFromFrame: 0 }
      : { id: randomUUID(), type: 'image' as const, durationInFrames: frames, src: asset.storageKey, objectFit: intent.objectFit };
    const candidate = { ...base, scenes: intent.placement === 'append' ? [...base.scenes, scene] : base.scenes.map((entry) => entry.id === intent.replaceSceneId ? { ...scene, transition: entry.transition } : entry) };
    if (intent.placement === 'replace' && !base.scenes.some((entry) => entry.id === intent.replaceSceneId)) throw new AssistantError('scene_missing', 'Cảnh cần thay đã bị xóa. Lập yêu cầu dựng mới.');
    const policy = await this.sceneGeneration.assetPolicy(context.owner, projectAssets(candidate));
    const validated = validateCandidate(base, candidate, policy);
    const conversation = await this.owned(id, epoch); this.assertCurrent(conversation, epoch);
    if (conversation.view.proposals.length >= 4) throw new AssistantError('proposal_limit', 'Áp dụng hoặc bỏ qua bản nháp cũ trước.');
    const proposal: ProjectProposal = { id: randomUUID(), epoch, projectId: base.id, baseRevision: context.snapshot.revision,
      fingerprint: projectFingerprint(base), summary: `${intent.placement === 'append' ? 'Thêm' : 'Thay'} cảnh ${asset.mediaType === 'video' ? 'hoạt họa core' : status.plan.preset.providerId === 'gemini' ? 'ảnh Gemini' : 'ảnh core'}`,
      candidate: validated, affected: [scene.id, ...(intent.replaceSceneId ? [intent.replaceSceneId] : [])], warnings: [] };
    validateProjectSnapshot({ ...context.snapshot, project: validated }); conversation.view.proposals.push(proposal); this.emit(conversation); return structuredClone(proposal);
  }
  async reserveProposal(id: string, epoch: string, proposalId: string, attemptId: string, rawSnapshot: unknown) {
    const conversation = await this.owned(id, epoch); this.assertCurrent(conversation, epoch);
    if (this.appliedLeases.has(attemptId)) throw new AssistantError('proposal_consumed', 'Lần áp dụng đã được xác nhận.', 409);
    const snapshot = validateProjectSnapshot(rawSnapshot);
    const proposal = conversation.view.proposals.find((entry) => entry.id === proposalId);
    if (!proposal) throw new AssistantError('proposal_consumed', 'Bản nháp đã được xử lý.', 409);
    const policy = this.sceneGeneration ? await this.sceneGeneration.assetPolicy(this.generationOwner(conversation), projectAssets(proposal.candidate)) : undefined;
    this.assertCurrent(conversation, epoch); validateProposal(snapshot.project, snapshot.revision, epoch, proposal, policy);
    const key = `${id}:${proposalId}`; const existing = this.proposalLeases.get(key);
    if (existing && existing.lease.expiresAt > Date.now() && existing.lease.attemptId !== attemptId) throw new AssistantError('proposal_reserved', 'Tab khác đang áp dụng bản nháp này.', 409);
    if (this.proposalLeases.size >= 1000) for (const [leaseKey, entry] of this.proposalLeases) if (entry.lease.expiresAt <= Date.now()) this.proposalLeases.delete(leaseKey);
    const lease = existing?.lease.attemptId === attemptId && existing.lease.expiresAt > Date.now() ? existing.lease : { attemptId, expiresAt: Date.now() + 30000 };
    this.proposalLeases.set(key, { owner: epoch, proposalId, lease });
    return { proposal: structuredClone(proposal), lease, assets: this.sceneGeneration ? await this.sceneGeneration.assets(this.generationOwner(conversation)) : [] };
  }
  async acknowledgeProposal(id: string, epoch: string, proposalId: string, attemptId: string, applied: boolean): Promise<void> {
    const conversation = await this.owned(id, epoch); this.assertCurrent(conversation, epoch);
    if (this.appliedLeases.get(attemptId) === `${id}:${proposalId}`) return;
    const key = `${id}:${proposalId}`; const reservation = this.proposalLeases.get(key);
    if (!reservation || reservation.owner !== epoch || reservation.lease.attemptId !== attemptId) throw new AssistantError('approval_expired', 'Lần áp dụng đã hết hiệu lực.', 409);
    if (applied) {
      conversation.view.proposals = conversation.view.proposals.filter((entry) => entry.id !== proposalId);
      this.appliedLeases.set(attemptId, key);
      if (this.appliedLeases.size > 1000) this.appliedLeases.delete(this.appliedLeases.keys().next().value!);
    }
    this.proposalLeases.delete(key); this.emit(conversation);
  }
  async consumeProposal(id: string, epoch: string, proposalId: string, rawSnapshot: unknown): Promise<ProjectProposal> {
    const conversation = await this.owned(id, epoch);
    this.assertCurrent(conversation, epoch);
    const reservation = this.proposalLeases.get(`${id}:${proposalId}`);
    if (reservation && reservation.lease.expiresAt > Date.now()) throw new AssistantError('proposal_reserved', 'Có tab đang áp dụng bản nháp này.', 409);
    const snapshot = validateProjectSnapshot(rawSnapshot);
    const proposal = conversation.view.proposals.find((entry) => entry.id === proposalId);
    if (!proposal) throw new AssistantError('proposal_consumed', 'Proposal đã được xử lý ở tab khác hoặc không còn hợp lệ.', 409);
    try { validateProposal(snapshot.project, snapshot.revision, epoch, proposal); }
    catch { throw new AssistantError('proposal_conflict', 'Project đã thay đổi. Hãy tạo proposal mới từ snapshot hiện tại.', 409); }
    conversation.view.proposals = conversation.view.proposals.filter((entry) => entry.id !== proposalId);
    this.emit(conversation);
    return structuredClone(proposal);
  }
  async cancel(id: string, epoch: string): Promise<void> {
    const conversation = await this.owned(id, epoch);
    this.assertCurrent(conversation, epoch);
    if (conversation.view.status !== 'running') return;
    if (conversation.runtime && conversation.threadId && conversation.turnId) {
      try { await conversation.runtime.request('turn/interrupt', { threadId: conversation.threadId, turnId: conversation.turnId }); }
      catch { conversation.runtime.dispose(); }
    } else conversation.runtime?.dispose();
    this.finish(conversation, 'interrupted');
  }
  reset(): void {
    this.proposalLeases.clear(); this.appliedLeases.clear(); this.sceneGeneration?.suspend();
    clearTimeout(this.persistenceTimer);
    this.generation++;
    for (const conversation of this.conversations.values()) {
      this.finish(conversation, 'interrupted');
      conversation.runtime?.dispose();
      conversation.token = undefined;
      for (const render of conversation.view.renders) if (['queued', 'rendering'].includes(render.status)) this.renderer.cancel(render.id);
      conversation.listeners.clear();
    }
    this.conversations.clear();
    this.persist();
  }
  suspend(): void {
    this.proposalLeases.clear(); this.sceneGeneration?.suspend();
    this.generation++;
    clearTimeout(this.persistenceTimer);
    for (const conversation of this.conversations.values()) {
      if (conversation.view.status === 'running') this.finish(conversation, 'interrupted', 'Kết nối tài khoản đang thay đổi. Tác vụ cũ không được phát lại.');
      const runtime = conversation.runtime; conversation.runtime = undefined;
      if (runtime) {
        conversation.stopping = runtime.stop();
        void conversation.stopping.catch(() => { conversation.view.error = 'Runtime chưa dừng hoàn toàn. Mở lại app trước khi thử tác vụ mới.'; });
      }
      conversation.token = undefined;
      conversation.view.epoch = randomUUID();
      conversation.view.approvals = [];
      conversation.view.proposals = [];
      conversation.events = []; conversation.sequence = 0;
      conversation.listeners.clear();
      for (const render of conversation.view.renders) if (['queued', 'rendering'].includes(render.status)) this.renderer.cancel(render.id);
    }
    this.persist();
  }
  dispose(): void {
    this.sceneGeneration?.dispose();
    clearTimeout(this.persistenceTimer);
    for (const conversation of this.conversations.values()) {
      if (conversation.view.status === 'running') this.finish(conversation, 'interrupted', 'Server đã đóng. Không tự phát lại tác vụ.');
      const runtime = conversation.runtime; conversation.runtime = undefined; runtime?.dispose();
      conversation.token = undefined;
      conversation.listeners.clear();
    }
    this.persist();
  }
}
