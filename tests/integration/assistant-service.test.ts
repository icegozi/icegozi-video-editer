import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { AssistantService } from '../../src/application/assistant/assistantService';
import { fakeAssistantAuth, fakeAssistantRuntime } from '../fixtures/assistant-fixtures';
import { mockProject } from '../fixtures/mock-project';
import type { AssistantEvent } from '../../src/application/assistant/assistant.contracts';
import { validLocalRequest } from '../../src/infrastructure/server/codexApiPlugin';
import type { IncomingMessage } from 'node:http';
import { createInitialState, editorReducer } from '../../src/editor/state/editorStore';

const snapshot = () => ({ project: structuredClone(mockProject), revision: 1, selectedClipId: 'scene-1', playhead: 0 });
async function fixture() {
  const runtime = await fakeAssistantRuntime();
  const auth = fakeAssistantAuth();
  const create = vi.fn(() => ({ id: 'job-fixture' }));
  const job = { status: 'rendering', progress: 30, outputReady: false };
  const cancel = vi.fn(() => true);
  const service = new AssistantService(auth, { create, status: () => job, cancel }, '/fixture', async () => runtime.rpc);
  const view = await service.open(snapshot());
  const send = (id = randomUUID()) => service.send(view.id, view.epoch, id, 'Rút scene đầu', 'fixture-model', snapshot());
  const tool = (name: string, arguments_: unknown, callId = randomUUID(), id = 200) => runtime.notify({ id, method: 'item/tool/call', params: { threadId: 'fixture-thread', turnId: 'fixture-turn-1', callId, namespace: 'video_editor', tool: name, arguments: arguments_ } });
  return { runtime, auth, create, job, cancel, service, view, send, tool };
}
describe('Local assistant isolation and side effects', () => {
  it('reserves a draft without consuming it, rejects competing tabs and keeps it after a stale reducer apply', async () => {
    const f = await fixture(); await f.send();
    f.tool('propose_project_change', { summary: 'Reserve fixture', candidate: { ...mockProject, title: 'Reserved draft' } });
    await vi.waitFor(async () => expect((await f.service.open(snapshot())).proposals).toHaveLength(1));
    const proposal = (await f.service.open(snapshot())).proposals[0]; const attemptId = randomUUID();
    const reserved = await f.service.reserveProposal(f.view.id, f.view.epoch, proposal.id, attemptId, snapshot());
    await expect(f.service.reserveProposal(f.view.id, f.view.epoch, proposal.id, randomUUID(), snapshot())).rejects.toThrow('Tab khác');
    await expect(f.service.consumeProposal(f.view.id, f.view.epoch, proposal.id, snapshot())).rejects.toThrow('tab');
    const edited = { ...createInitialState(mockProject), assistantEpoch: f.view.epoch, revision: 2, project: { ...mockProject, title: 'Manual edit during HTTP' } };
    const rejected = editorReducer(edited, { type: 'APPLY_AI_PROJECT_CHANGE', proposal: reserved.proposal, lease: reserved.lease });
    expect(rejected.project).toBe(edited.project); expect(rejected.assistantApplyError).toBeTruthy();
    await f.service.acknowledgeProposal(f.view.id, f.view.epoch, proposal.id, attemptId, false);
    expect((await f.service.open(snapshot())).proposals).toHaveLength(1);
    const secondId = randomUUID(); const retried = await f.service.reserveProposal(f.view.id, f.view.epoch, proposal.id, secondId, snapshot());
    const applied = editorReducer({ ...createInitialState(mockProject), assistantEpoch: f.view.epoch }, { type: 'APPLY_AI_PROJECT_CHANGE', proposal: retried.proposal, lease: retried.lease });
    expect(applied.historyPast).toHaveLength(1); expect(applied.project.title).toBe('Reserved draft');
    await f.service.acknowledgeProposal(f.view.id, f.view.epoch, proposal.id, secondId, true);
    await f.service.acknowledgeProposal(f.view.id, f.view.epoch, proposal.id, secondId, true);
    expect((await f.service.open(snapshot())).proposals).toHaveLength(0); f.service.dispose();
  });
  it('enforces exact Host/Origin and capability including event reads', () => {
    const request = (headers: IncomingMessage['headers']) => ({ headers }) as IncomingMessage;
    const valid = { host: '127.0.0.1:3200', origin: 'http://127.0.0.1:3200', 'x-icegozi-capability': 'fixture-cap' };
    expect(validLocalRequest(request(valid), valid.origin, 'fixture-cap')).toBe(true);
    for (const headers of [{ ...valid, host: 'evil.example' }, { ...valid, origin: 'https://evil.example' }, { ...valid, 'x-icegozi-capability': '' }, { ...valid, 'sec-fetch-site': 'same-site' }]) {
      expect(validLocalRequest(request(headers), valid.origin, 'fixture-cap')).toBe(false);
    }
  });
  it('rejects traversal, secret paths, remote media and executable composition context', async () => {
    const f = await fixture();
    for (const src of ['../.env.local', 'C:\\Users\\token', 'assets/video/../../.env', 'https://outside.invalid/a.mp4']) {
      await expect(f.service.open({ ...snapshot(), project: { ...mockProject, audioTracks: [{ ...mockProject.audioTracks![0], src }] } })).rejects.toThrow();
    }
    await expect(f.service.open({ ...snapshot(), project: { ...mockProject, scenes: [{ id: 'unsafe', type: 'composition', componentName: 'Anything', durationInFrames: 20 }] } })).rejects.toThrow();
    f.service.dispose();
  });
  it('does not send duplicate turns and blocks competing tabs while running', async () => {
    const f = await fixture(); const requestId = randomUUID();
    await f.send(requestId); await f.send(requestId);
    await expect(f.send()).rejects.toThrow('đang chạy');
    const secondTab = await f.service.open(snapshot()); expect(secondTab.id).toBe(f.view.id);
    expect(f.runtime.requests.filter((r) => r.method === 'turn/start')).toHaveLength(1);
    const thread = f.runtime.requests.find((r) => r.method === 'thread/start')!.params as Record<string, unknown>;
    expect(thread.environments).toEqual([]);
    expect(JSON.stringify(f.runtime.requests)).not.toContain('synthetic-fixture-token');
    f.service.dispose();
  });
  it('streams bounded snapshots for reconnect without repeating deltas or replaying turns', async () => {
    const f = await fixture(); await f.send();
    f.runtime.notify({ method: 'item/agentMessage/delta', params: { threadId: 'fixture-thread', turnId: 'fixture-turn-1', itemId: 'answer', delta: 'Xin chào' } });
    const events: AssistantEvent[] = [];
    const unsubscribe = await f.service.subscribe(f.view.id, f.view.epoch, 0, (event) => events.push(event));
    expect(events.at(-1)!.conversation.messages.at(-1)!.text).toBe('Xin chào');
    unsubscribe();
    const replay: AssistantEvent[] = [];
    const stop = await f.service.subscribe(f.view.id, f.view.epoch, 0, (event) => replay.push(event));
    expect(replay).toHaveLength(1);
    expect(f.runtime.requests.filter((r) => r.method === 'turn/start')).toHaveLength(1);
    stop(); f.service.dispose();
  });
  it.each(['failed', 'interrupted', 'completed'])('recognizes %s only from terminal status', async (terminal) => {
    const f = await fixture(); await f.send();
    f.runtime.notify({ method: 'turn/completed', params: { threadId: 'fixture-thread', turn: { id: 'fixture-turn-1', status: terminal } } });
    const view = await f.service.open(snapshot()); expect(view.status).toBe(terminal);
    f.service.dispose();
  });
  it('creates validated draft via a tool and rejects arbitrary RPC/tools', async () => {
    const f = await fixture(); await f.send();
    f.tool('propose_project_change', { summary: 'Rút scene', candidate: { ...mockProject, title: 'Draft only' } });
    await vi.waitFor(async () => expect((await f.service.open(snapshot())).proposals).toHaveLength(1));
    expect(mockProject.title).toBe('Test Project');
    const proposal = (await f.service.open(snapshot())).proposals[0];
    await expect(f.service.consumeProposal(f.view.id, f.view.epoch, proposal.id, { ...snapshot(), revision: 2 })).rejects.toThrow('thay đổi');
    await f.service.consumeProposal(f.view.id, f.view.epoch, proposal.id, snapshot());
    await expect(f.service.consumeProposal(f.view.id, f.view.epoch, proposal.id, snapshot())).rejects.toThrow('xử lý');
    f.tool('shell', { command: 'read secret' }, randomUUID(), 201);
    await vi.waitFor(() => expect(f.runtime.requests.find((r) => r.id === 201 && r.result)).toBeTruthy());
    expect(f.runtime.requests.find((r) => r.id === 201 && r.result)!.result).toMatchObject({ success: false });
    f.runtime.notify({ id: 202, method: 'unknown/serverRequest', params: {} });
    expect(f.runtime.requests.find((r) => r.id === 202 && r.error)).toBeTruthy();
    f.service.dispose();
  });
  it('deduplicates preview creation and exposes output only when completed and present', async () => {
    const f = await fixture(); const requestId = randomUUID();
    const a = await f.service.render(f.view.id, f.view.epoch, requestId, snapshot());
    const b = await f.service.render(f.view.id, f.view.epoch, requestId, snapshot());
    expect(a.id).toBe(b.id); expect(f.create).toHaveBeenCalledOnce();
    expect(f.create.mock.calls[0]?.length).toBe(1);
    expect((await f.service.previewStatus(f.view.id, f.view.epoch, a.id)).downloadUrl).toBeNull();
    f.job.status = 'completed'; expect((await f.service.previewStatus(f.view.id, f.view.epoch, a.id)).downloadUrl).toBeNull();
    f.job.outputReady = true; expect((await f.service.previewStatus(f.view.id, f.view.epoch, a.id)).downloadUrl).toContain('/api/codex/preview/');
    await expect(f.service.previewStatus(f.view.id, f.view.epoch, 'another-job')).rejects.toThrow('không thuộc');
    await f.service.cancelRender(f.view.id, f.view.epoch, a.id); expect(f.cancel).toHaveBeenCalledWith(a.id);
    f.service.dispose();
  });
  it('requires render approval, declines stale approvals and sends cancellation to runtime', async () => {
    const f = await fixture(); await f.send(); f.tool('render_project_preview', {});
    await vi.waitFor(async () => expect((await f.service.open(snapshot())).approvals).toHaveLength(1));
    expect(f.create).not.toHaveBeenCalled();
    await f.service.approval(f.view.id, f.view.epoch, '200', 'accept');
    await vi.waitFor(() => expect(f.create).toHaveBeenCalledOnce());
    await expect(f.service.approval(f.view.id, f.view.epoch, '200', 'accept')).rejects.toThrow('hết hạn');
    await f.service.cancel(f.view.id, f.view.epoch);
    expect(f.runtime.requests.some((r) => r.method === 'turn/interrupt')).toBe(true);
    f.service.dispose();
  });
  it('isolates project/account switches and ignores events after reset', async () => {
    const f = await fixture(); await f.send();
    const other = await f.service.open({ ...snapshot(), project: { ...mockProject, id: 'other' } }); expect(other.id).not.toBe(f.view.id);
    f.service.reset();
    await expect(f.service.subscribe(f.view.id, f.view.epoch, 0, () => undefined)).rejects.toThrow('thay đổi');
    f.runtime.notify({ method: 'item/agentMessage/delta', params: { threadId: 'fixture-thread', delta: 'late' } });
    expect((await f.service.open(snapshot())).messages).toHaveLength(0);
  });
  it('does not use any fallback after provider quota failure', async () => {
    const f = await fixture();
    f.auth.listModels = async () => { throw { code: 'subscription_sharing_usage_limit_exceeded' }; };
    const result = await f.send(); expect(result.status).toBe('failed'); expect(result.error).toContain('hạn mức');
    expect(f.runtime.requests.some((r) => r.method === 'turn/start')).toBe(false);
    f.service.dispose();
  });
  it('restores bounded chat metadata and receipts without replaying a turn/render after restart', async () => {
    let saved: unknown = [];
    const persistence = { read: () => structuredClone(saved), write: (data: unknown) => { saved = structuredClone(data); } };
    const auth = fakeAssistantAuth(); const runtime = await fakeAssistantRuntime();
    const create = vi.fn(() => ({ id: 'persisted-job' }));
    const renderer = { create, status: () => ({ status: 'cancelled', progress: 0, outputReady: false }), cancel: () => true };
    const first = new AssistantService(auth, renderer, '/fixture', async () => runtime.rpc, persistence);
    const view = await first.open(snapshot()); const requestId = randomUUID(); const renderId = randomUUID();
    await first.render(view.id, view.epoch, renderId, snapshot());
    await first.send(view.id, view.epoch, requestId, 'Save fixture history', 'fixture-model', snapshot());
    first.dispose();
    const launch = vi.fn(async () => runtime.rpc);
    const second = new AssistantService(auth, renderer, '/fixture', launch, persistence);
    const restored = await second.open(snapshot());
    expect(restored.status).toBe('interrupted'); expect(restored.messages).toHaveLength(1);
    await second.send(restored.id, restored.epoch, requestId, 'Save fixture history', 'fixture-model', snapshot());
    await second.render(restored.id, restored.epoch, renderId, snapshot());
    expect(launch).not.toHaveBeenCalled(); expect(create).toHaveBeenCalledOnce();
    expect(JSON.stringify(saved)).not.toContain('synthetic-fixture-token');
    second.dispose();
  });
  it('never replays a turn when renewal needs resume and resume fails', async () => {
    const auth = fakeAssistantAuth(); let token = 'token-fixture-1';
    auth.getRuntimeCredential = async () => ({ accessToken: token, profileId: 'fixture-profile' });
    const first = await fakeAssistantRuntime(); const second = await fakeAssistantRuntime({ rejectResume: true }); const third = await fakeAssistantRuntime();
    const runtimes = [first, second, third]; let launched = 0;
    const service = new AssistantService(auth, { create: () => ({ id: 'unused' }), status: () => null, cancel: () => true }, '/fixture', async () => runtimes[launched++].rpc);
    const view = await service.open(snapshot());
    await service.send(view.id, view.epoch, randomUUID(), 'First explicit turn', 'fixture-model', snapshot());
    first.notify({ method: 'turn/completed', params: { threadId: 'fixture-thread', turn: { id: 'fixture-turn-1', status: 'completed' } } });
    token = 'token-fixture-2';
    const failed = await service.send(view.id, view.epoch, randomUUID(), 'Second explicit turn', 'fixture-model', snapshot());
    expect(failed.status).toBe('failed'); expect(failed.error).toContain('thread cũ');
    expect(second.requests.some((r) => r.method === 'turn/start')).toBe(false);
    await service.send(view.id, view.epoch, randomUUID(), 'User chooses retry', 'fixture-model', snapshot());
    expect(third.requests.filter((r) => r.method === 'turn/start')).toHaveLength(1);
    service.dispose();
  });

  it('loads app skills and returns field errors without creating a draft or render', async () => {
    const f = await fixture(); await f.send();
    const response = (id: number) => f.runtime.requests.find((message) => message.id === id && message.result)?.result as { success: boolean; contentItems: { text: string }[] } | undefined;
    f.tool('get_editor_capabilities', {}, randomUUID(), 301);
    f.tool('read_video_skill', { skillId: 'icegozi-text-motion' }, randomUUID(), 302);
    f.tool('validate_project_change', { candidate: { ...mockProject, scenes: [{ id: 'title-a', type: 'text', title: 'A', durationInFrames: 150, animationType: 'scale', startScale: 0 }] } }, randomUUID(), 303);
    await vi.waitFor(() => expect(response(303)).toBeDefined());
    expect(JSON.parse(response(301)!.contentItems[0].text).skills).toHaveLength(7);
    expect(JSON.parse(response(302)!.contentItems[0].text).name).toBe('icegozi-text-motion');
    const validation = JSON.parse(response(303)!.contentItems[0].text);
    expect(validation.valid).toBe(false);
    expect(validation.errors[0].path).toEqual(['scenes', 0, 'startScale']);
    expect((await f.service.open(snapshot())).proposals).toHaveLength(0);
    expect(f.create).not.toHaveBeenCalled();
    f.service.dispose();
  });

  it('requires approval for a final render and preserves its profile', async () => {
    const f = await fixture(); await f.send();
    f.tool('render_project', { profile: 'final' });
    await vi.waitFor(async () => expect((await f.service.open(snapshot())).approvals).toHaveLength(1));
    expect(f.create).not.toHaveBeenCalled();
    await f.service.approval(f.view.id, f.view.epoch, '200', 'accept');
    await vi.waitFor(() => expect(f.create).toHaveBeenCalledWith(expect.objectContaining({ id: mockProject.id }), 'final'));
    expect((await f.service.open(snapshot())).renders[0].profile).toBe('final');
    f.service.dispose();
  });

  it('refreshes an outdated toolset with a new native thread while retaining UI history', async () => {
    let saved: unknown = [];
    const persistence = { read: () => structuredClone(saved), write: (data: unknown) => { saved = structuredClone(data); } };
    const renderer = { create: () => ({ id: 'unused' }), status: () => null, cancel: () => true };
    const auth = fakeAssistantAuth();
    const firstRuntime = await fakeAssistantRuntime();
    const first = new AssistantService(auth, renderer, '/fixture', async () => firstRuntime.rpc, persistence);
    const firstView = await first.open(snapshot());
    await first.send(firstView.id, firstView.epoch, randomUUID(), 'Old chat to preserve', 'fixture-model', snapshot());
    first.dispose();
    (saved as { toolsetVersion?: string }[])[0].toolsetVersion = 'old-toolset';
    const nextRuntime = await fakeAssistantRuntime();
    const next = new AssistantService(auth, renderer, '/fixture', async () => nextRuntime.rpc, persistence);
    const restored = await next.open(snapshot());
    await next.send(restored.id, restored.epoch, randomUUID(), 'Use new skills', 'fixture-model', snapshot());
    expect(nextRuntime.requests.some((message) => message.method === 'thread/resume')).toBe(false);
    const started = nextRuntime.requests.find((message) => message.method === 'thread/start')!.params as { dynamicTools: { tools: { name: string }[] }[] };
    expect(started.dynamicTools[0].tools.some((tool) => tool.name === 'read_video_skill')).toBe(true);
    expect((await next.open(snapshot())).messages[0].text).toBe('Old chat to preserve');
    next.dispose();
  });
});
