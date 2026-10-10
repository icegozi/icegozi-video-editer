import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { useAssistant } from '../../hooks/useAssistant';
import './assistant.css';

export const AssistantPanel: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const assistant = useAssistant();
  const [text, setText] = useState('');
  const auth = assistant.status?.auth;
  const running = assistant.conversation?.status === 'running';
  const connecting = auth?.status === 'connecting';
  const authLabel = connecting ? 'Đang chờ xác nhận đăng nhập' : auth?.status === 'reauth_required' ? 'Phiên hết hạn hoặc cần kết nối lại' : auth?.status === 'connected' ? auth.sharing ? 'Đã kết nối · Đã cấp quyền dùng gói' : 'Đã đăng nhập · Chưa cấp quyền dùng gói' : 'Chưa kết nối ChatGPT';
  return <aside className="assistant-panel" hidden={!open} aria-label="Trợ lý AI" data-testid="assistant-panel">
    <header><strong>Trợ lý video · Codex</strong><Button size="sm" variant="ghost" onClick={onClose} aria-label="Đóng trợ lý AI">Đóng</Button></header>
    <section>
      <p role="status">{authLabel}</p>
      <p>{assistant.status?.runtime.available ? `Codex ${assistant.status.runtime.version}` : assistant.status?.runtime.message ?? 'Đang kiểm tra runtime…'}</p>
      {auth?.identity && <p>{auth.identity.email ?? auth.identity.name} · {auth.profileLabel}</p>}
      <div className="assistant-actions">
        <Button disabled={assistant.busy || connecting} onClick={() => void assistant.login()}>Continue with ChatGPT</Button>
        {auth?.profileId && <Button disabled={assistant.busy || connecting} onClick={() => void assistant.login(true)}>Thêm tài khoản</Button>}
        {auth?.profileId && <Button disabled={assistant.busy} onClick={() => void assistant.logout()}>Đăng xuất</Button>}
        {connecting && <Button disabled={assistant.busy} onClick={() => void assistant.cancelLogin()}>Hủy đăng nhập</Button>}
      </div>
      <p className="assistant-muted">Dùng tài khoản và gói của bạn; quyền/model và hạn mức do OpenAI xác nhận. Bạn tự quản lý gói trong ChatGPT.</p>
      {assistant.status?.loginUrl && <a href={assistant.status.loginUrl} target="_blank" rel="noreferrer">Mở trình duyệt để đăng nhập và cấp quyền</a>}
      <a href="https://chatgpt.com/settings/usage" target="_blank" rel="noreferrer">Quản lý kết nối và usage</a>
      {!!assistant.status?.profiles.length && <label>Tài khoản/workspace
        <select value={auth?.profileId ?? ''} disabled={assistant.busy || connecting} onChange={(event) => void assistant.selectProfile(event.target.value)}>
          <option value="" disabled>Chọn kết nối</option>
          {assistant.status.profiles.map((profile) => <option key={profile.id} value={profile.id} disabled={profile.pending}>{profile.label} · {profile.status}</option>)}
        </select>
      </label>}
      <label>Model của phiên ChatGPT
        <select value={assistant.model} disabled={!auth?.sharing || assistant.busy || running} onChange={(event) => assistant.setModel(event.target.value)}>
          {!assistant.models.length && <option value="">Chưa có catalog được xác nhận</option>}
          {assistant.models.map((model) => <option key={model.slug} value={model.slug}>{model.displayName}</option>)}
        </select>
      </label>
      <Button size="sm" disabled={!auth?.sharing || assistant.busy} onClick={() => void assistant.refreshModels()}>Tải lại model</Button>
    </section>
    {(assistant.error || auth?.error || assistant.applyError || assistant.conversation?.error) && <p role="alert" className="assistant-error">{assistant.error ?? auth?.error?.message ?? assistant.applyError ?? assistant.conversation?.error}</p>}
    <section className="assistant-history" aria-label="Lịch sử chat">
      {!assistant.conversation?.messages.length && <p className="assistant-muted">Mô tả thay đổi bạn muốn. AI đọc snapshot project đang mở và tạo đề xuất để bạn duyệt.</p>}
      {assistant.conversation?.messages.map((message) => <article key={message.id}><strong>{message.role === 'user' ? 'Bạn' : 'Codex'}</strong><p>{message.text}</p></article>)}
      <p role="status">{assistant.conversation?.progress}</p>
      {assistant.conversation?.approvals.map((approval) => <article key={approval.id} className="assistant-proposal">
        <strong>Công cụ cần duyệt · {approval.tool}</strong><p>{approval.description}</p>
        <div className="assistant-actions">{(['accept', 'decline', 'cancel'] as const).map((decision) => <Button key={decision} disabled={assistant.busy} onClick={() => void assistant.approval(approval.id, decision)}>{decision === 'accept' ? 'Cho phép render' : decision === 'decline' ? 'Từ chối' : 'Hủy tác vụ'}</Button>)}</div>
      </article>)}
      {assistant.conversation?.proposals.map((proposal) => <article className="assistant-proposal" key={proposal.id}>
        <strong>Đề xuất · revision {proposal.baseRevision}</strong><p>{proposal.summary}</p>
        <p>Scene/track: {proposal.affected.join(', ') || 'Thay đổi project'} · {proposal.candidate.scenes.length} scene</p>
        {proposal.warnings.map((warning) => <p key={warning}>{warning}</p>)}
        <details><summary>Xem project dự kiến</summary><pre>{JSON.stringify(proposal.candidate, null, 2)}</pre></details>
        <div className="assistant-actions"><Button disabled={assistant.busy || assistant.applied.includes(proposal.id)} onClick={() => void assistant.apply(proposal)}>{assistant.applied.includes(proposal.id) ? 'Đã áp dụng' : 'Áp dụng'}</Button><Button disabled={assistant.busy} onClick={() => void assistant.dismiss(proposal)}>Bỏ qua</Button></div>
      </article>)}
      {assistant.conversation?.renders.map((job) => <article key={job.id}><strong>Preview · {job.projectId}</strong><p>{job.status} · {job.progress}% · snapshot {job.fingerprint.slice(0, 12)}</p>
        {job.downloadUrl && <Button disabled={assistant.busy} onClick={() => void assistant.preview(job)}>Xem MP4</Button>}
        {['queued', 'rendering'].includes(job.status) && <Button disabled={assistant.busy} onClick={() => void assistant.cancelRender(job.id)}>Hủy render</Button>}
      </article>)}
      {assistant.previewUrl && <video controls src={assistant.previewUrl} style={{ width: '100%' }} />}
    </section>
    <form onSubmit={(event) => { event.preventDefault(); if (text.trim()) void assistant.send(text); }}>
      <label htmlFor="assistant-input">Yêu cầu chỉnh sửa</label>
      <textarea id="assistant-input" value={text} maxLength={8000} onChange={(event) => setText(event.target.value)} placeholder="Ví dụ: rút ngắn scene đầu còn 60 frame…" />
      <div className="assistant-actions">
        <Button type="submit" variant="primary" disabled={assistant.busy || running || !auth?.sharing || !assistant.model || !text.trim() || !assistant.status?.runtime.available}>Gửi</Button>
        <Button type="button" disabled={!running} onClick={() => void assistant.cancel()}>Dừng tác vụ</Button>
        <Button type="button" disabled={assistant.busy || running} onClick={() => void assistant.render()}>Render snapshot hiện tại</Button>
      </div>
    </form>
  </aside>;
};
