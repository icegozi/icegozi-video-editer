import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  User,
  ExternalLink,
  RefreshCw,
  LogOut,
  LogIn,
  Video,
  FileCode,
  AlertCircle,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { useAssistant } from '../../hooks/useAssistant';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { Select } from '../ui/Select';
import { PromptComposer } from './PromptComposer';
import { ProposalCard } from './ProposalCard';
import { ApprovalCard } from './ApprovalCard';
import { ContextChipsBar } from './ContextChipsBar';

const WORKFLOW_TEMPLATES = [
  {
    title: 'Kéo dài thời lượng',
    prompt: 'Kéo dài scene mở đầu thêm 2 giây và thêm hiệu ứng fade out.',
  },
  {
    title: 'Đổi phong cách màu',
    prompt: 'Đổi màu nền scene mở đầu thành xanh nhạt (#0F172A) và chữ màu trắng sáng.',
  },
  {
    title: 'Thêm công thức toán học',
    prompt: 'Thêm một scene công thức LaTeX E = mc^2 với giải thích thuyết tương đối.',
  },
  {
    title: 'Giới thiệu ICEGOZI',
    prompt: 'Tạo 3 scene giới thiệu dự án ICEGOZI Video với nhịp điệu hiện đại, tỷ lệ 16:9.',
  },
];

export const AiChatPanel: React.FC = () => {
  const assistant = useAssistant();
  const [promptText, setPromptText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const auth = assistant.status?.auth;
  const running = assistant.conversation?.status === 'running';
  const connecting = auth?.status === 'connecting';
  const isConnected = auth?.status === 'connected';

  // Auto-scroll chat to bottom when messages or proposals update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [
    assistant.conversation?.messages.length,
    assistant.conversation?.proposals.length,
    assistant.conversation?.progress,
    assistant.conversation?.status,
  ]);

  const handleSendPrompt = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await assistant.send(trimmed);
      setPromptText((current) => (current === text || current === trimmed ? '' : current));
    } catch {
      // Preserve prompt draft on send error or network rejection
    }
  };

  const handleTemplateClick = (templatePrompt: string) => {
    setPromptText(templatePrompt);
  };

  const renderAuthBadge = () => {
    if (connecting) {
      return (
        <span
          style={{
            fontSize: '11px',
            color: 'var(--color-warning, #B45309)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-warning)',
            }}
          />
          Đang kết nối ChatGPT…
        </span>
      );
    }
    if (isConnected && auth?.sharing) {
      return (
        <span
          style={{
            fontSize: '11px',
            color: 'var(--color-success, #167A4A)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-success)',
            }}
          />
          ChatGPT Pro/Plus kết nối
        </span>
      );
    }
    if (isConnected) {
      return (
        <span
          style={{
            fontSize: '11px',
            color: 'var(--color-warning)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-warning)',
            }}
          />
          Chưa cấp quyền gói
        </span>
      );
    }
    return (
      <span
        style={{
          fontSize: '11px',
          color: 'var(--color-text-muted, #64748B)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#CBD5E1',
          }}
        />
        Chưa kết nối ChatGPT
      </span>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--color-surface, #FFFFFF)',
        borderRight: '1px solid var(--color-border-subtle, #E2E8F0)',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
      data-testid="ai-chat-workspace"
    >
      {/* 1. Panel Header & ChatGPT Session Bar */}
      <header
        style={{
          padding: '10px 14px',
          backgroundColor: 'var(--color-surface, #FFFFFF)',
          borderBottom: '1px solid var(--color-border-subtle, #E2E8F0)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} color="var(--color-primary, #3568E8)" />
            <h2
              style={{
                margin: 0,
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text-primary, #17233B)',
              }}
            >
              AI Studio · Codex
            </h2>
          </div>

          {renderAuthBadge()}
        </div>

        {/* Auth / Account Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '12px',
          }}
        >
          {auth?.identity ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--color-text-secondary, #475569)',
              }}
            >
              <span style={{ fontWeight: 500 }}>
                {auth.identity.email || auth.identity.name}
              </span>
              {auth.profileLabel && (
                <span
                  style={{
                    fontSize: '10px',
                    padding: '1px 5px',
                    backgroundColor: 'var(--color-surface-muted, #F8FAFC)',
                    border: '1px solid var(--color-border-default, #CBD5E1)',
                    borderRadius: '4px',
                  }}
                >
                  {auth.profileLabel}
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: 'var(--color-text-muted, #64748B)', fontSize: '11px' }}>
              Dùng tài khoản ChatGPT riêng của bạn
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {isConnected ? (
              <IconButton
                icon={<LogOut size={12} />}
                label="Đăng xuất ChatGPT"
                size="sm"
                onClick={() => void assistant.logout()}
                disabled={assistant.busy}
              />
            ) : (
              <Button
                variant="primary"
                size="sm"
                disabled={assistant.busy || connecting}
                onClick={() => void assistant.login()}
                icon={<LogIn size={12} />}
              >
                Đăng nhập
              </Button>
            )}

            {connecting && (
              <Button
                variant="ghost"
                size="sm"
                disabled={assistant.busy}
                onClick={() => void assistant.cancelLogin()}
              >
                Hủy
              </Button>
            )}
          </div>
        </div>

        {auth?.profileId && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '6px',
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              disabled={assistant.busy || connecting}
              onClick={() => void assistant.login(true)}
            >
              Thêm tài khoản
            </Button>
            {assistant.status?.profiles && assistant.status.profiles.length > 0 && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <Select
                  aria-label="Tài khoản ChatGPT"
                  value={auth.profileId}
                  disabled={assistant.busy || connecting}
                  options={assistant.status.profiles.map((profile) => ({
                    value: profile.id,
                    label: profile.label,
                    disabled: profile.pending,
                  }))}
                  onChange={(event) => void assistant.selectProfile(event.target.value)}
                  style={{ height: '26px', fontSize: '11px', padding: '0 6px' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Model Selector Bar (When Connected) */}
        {isConnected && auth?.sharing && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: '1px solid var(--color-border-subtle, #E2E8F0)',
            }}
          >
            <label
              htmlFor="ai-model-select"
              style={{
                fontSize: '11px',
                color: 'var(--color-text-muted, #64748B)',
                flexShrink: 0,
              }}
            >
              Model:
            </label>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Select
                id="ai-model-select"
                aria-label="Model AI"
                value={assistant.model}
                disabled={assistant.busy || running}
                options={
                  assistant.models.length === 0
                    ? [{ value: '', label: 'Chưa có catalog model' }]
                    : assistant.models.map((m) => ({
                        value: m.slug,
                        label: m.displayName,
                      }))
                }
                onChange={(e) => assistant.setModel(e.target.value)}
                style={{ height: '26px', fontSize: '11px', padding: '0 6px' }}
              />
            </div>

            <IconButton
              icon={<RefreshCw size={11} />}
              label="Tải lại danh sách model"
              size="sm"
              disabled={assistant.busy}
              onClick={() => void assistant.refreshModels()}
            />
          </div>
        )}

        {/* External login notification if waiting for browser popup */}
        {assistant.status?.loginUrl && connecting && (
          <div
            style={{
              marginTop: '6px',
              padding: '6px 8px',
              borderRadius: '6px',
              backgroundColor: '#EFF6FF',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ color: '#1D4ED8' }}>Đang chờ cấp quyền trên trình duyệt…</span>
            <a
              href={assistant.status.loginUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: 'var(--color-primary, #3568E8)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                textDecoration: 'none',
              }}
            >
              Mở lại link <ExternalLink size={10} />
            </a>
          </div>
        )}
      </header>

      {/* 2. Error Feedback Alerts */}
      {(assistant.error || auth?.error || assistant.applyError || assistant.conversation?.error) && (
        <div
          role="alert"
          style={{
            padding: '8px 12px',
            backgroundColor: '#FEE2E2',
            borderBottom: '1px solid #FECACA',
            color: '#B91C1C',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>
            {assistant.error ||
              auth?.error?.message ||
              assistant.applyError ||
              assistant.conversation?.error}
          </span>
        </div>
      )}

      {/* 3. Conversation Viewport & Message Stack */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: 'var(--color-page, #F7F9FC)',
        }}
        aria-label="Luồng hội thoại AI"
      >
        {/* Empty State: Workflow Suggestions */}
        {(!assistant.conversation || assistant.conversation.messages.length === 0) && (
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary-subtle, #EEF3FF)',
                color: 'var(--color-primary, #3568E8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px auto',
              }}
            >
              <Bot size={20} />
            </div>

            <h3
              style={{
                margin: '0 0 4px 0',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--color-text-primary, #0F172A)',
              }}
            >
              Bạn muốn tạo hoặc sửa video gì?
            </h3>
            <p
              style={{
                margin: '0 0 16px 0',
                fontSize: '12px',
                color: 'var(--color-text-muted, #64748B)',
                lineHeight: 1.4,
              }}
            >
              Codex đọc snapshot dự án hiện tại, đề xuất kế hoạch chỉnh sửa và chỉ áp dụng khi bạn duyệt.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                textAlign: 'left',
              }}
            >
              {WORKFLOW_TEMPLATES.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleTemplateClick(tpl.prompt)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-surface, #FFFFFF)',
                    border: '1px solid var(--color-border-subtle, #E2E8F0)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-primary, #3568E8)';
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-subtle, #EEF3FF)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--color-border-subtle, #E2E8F0)';
                    e.currentTarget.style.backgroundColor = 'var(--color-surface, #FFFFFF)';
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary, #0F172A)',
                      marginBottom: '2px',
                    }}
                  >
                    {tpl.title}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-text-secondary, #475569)',
                    }}
                  >
                    "{tpl.prompt}"
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Stream */}
        {assistant.conversation?.messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div
              key={message.id}
              style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
                flexDirection: isUser ? 'row-reverse' : 'row',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: isUser
                    ? 'var(--color-primary, #3568E8)'
                    : 'var(--color-surface, #FFFFFF)',
                  color: isUser ? '#FFFFFF' : 'var(--color-primary, #3568E8)',
                  border: isUser ? 'none' : '1px solid var(--color-border-subtle, #E2E8F0)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                {isUser ? <User size={13} /> : <Bot size={13} />}
              </div>

              <div
                style={{
                  maxWidth: '85%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  lineHeight: '1.45',
                  backgroundColor: isUser
                    ? 'var(--color-primary, #3568E8)'
                    : 'var(--color-surface, #FFFFFF)',
                  color: isUser ? '#FFFFFF' : 'var(--color-text-primary, #17233B)',
                  border: isUser ? 'none' : '1px solid var(--color-border-subtle, #E2E8F0)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {message.text}
              </div>
            </div>
          );
        })}

        {/* Live Running Progress */}
        {running && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-primary-subtle, #EEF3FF)',
              color: 'var(--color-primary, #3568E8)',
              fontSize: '12px',
            }}
          >
            <RefreshCw size={13} className="spin-animation" />
            <span>{assistant.conversation?.progress || 'Codex đang suy luận…'}</span>
          </div>
        )}

        {/* Tool Approvals Requests */}
        {assistant.conversation?.approvals.map((approval) => (
          <ApprovalCard
            key={approval.id}
            approval={approval}
            onDecision={(id, decision) => void assistant.approval(id, decision)}
            disabled={assistant.busy}
          />
        ))}

        {/* Proposals Cards */}
        {assistant.conversation?.proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            isApplied={assistant.applied.includes(proposal.id)}
            onApply={(prop) => assistant.apply(prop)}
            onDismiss={(prop) => void assistant.dismiss(prop)}
            disabled={assistant.busy}
          />
        ))}

        {/* Render Preview Jobs */}
        {assistant.conversation?.renders.map((job) => (
          <article
            key={job.id}
            style={{
              padding: '10px',
              borderRadius: '6px',
              backgroundColor: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border-subtle, #E2E8F0)',
              fontSize: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}
            >
              <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Video size={13} color="var(--color-primary, #3568E8)" /> Preview MP4
              </strong>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                {job.status} ({job.progress}%)
              </span>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              {job.downloadUrl && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={assistant.busy}
                  onClick={() => void assistant.preview(job)}
                >
                  Xem MP4
                </Button>
              )}
              {['queued', 'rendering'].includes(job.status) && (
                <Button
                  size="sm"
                  variant="danger"
                  disabled={assistant.busy}
                  onClick={() => void assistant.cancelRender(job.id)}
                >
                  Hủy render
                </Button>
              )}
            </div>
          </article>
        ))}

        {/* Rendered MP4 Inline Player */}
        {assistant.previewUrl && (
          <div
            style={{
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: '#000000',
              marginTop: '4px',
            }}
          >
            <video controls src={assistant.previewUrl} style={{ width: '100%', display: 'block' }} />
          </div>
        )}
      </div>

      {/* 4. Context Chips Bar */}
      <ContextChipsBar />

      {/* 5. Pinned Bottom Prompt Composer */}
      <PromptComposer
        value={promptText}
        onChange={setPromptText}
        onSend={handleSendPrompt}
        onCancel={() => void assistant.cancel()}
        isRunning={running}
        disabled={assistant.busy || !isConnected || !auth?.sharing || !assistant.model}
        placeholder={
          !isConnected
            ? 'Đăng nhập ChatGPT ở thanh trên để bắt đầu gửi yêu cầu…'
            : !auth?.sharing
            ? 'Cần cấp quyền chia sẻ gói ChatGPT để sử dụng AI…'
            : !assistant.model
            ? 'Đang tải danh sách model ChatGPT…'
            : 'Nhập yêu cầu chỉnh sửa video (Enter để gửi, Shift+Enter xuống dòng)…'
        }
      />
    </div>
  );
};
