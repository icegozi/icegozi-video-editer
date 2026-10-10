import type { AssistantAuth } from '../../../application/assistant/assistant.contracts';

const badgeStyle = {
  fontSize: '11px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
} as const;

function StatusDot({ color }: { color: string }) {
  return (
    <span
      style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: color,
      }}
    />
  );
}

export function AssistantAuthBadge({ auth }: { auth?: AssistantAuth }) {
  if (auth?.status === 'connecting') {
    return (
      <span style={{ ...badgeStyle, color: 'var(--color-warning, #B45309)' }}>
        <StatusDot color="var(--color-warning)" />
        Đang kết nối ChatGPT…
      </span>
    );
  }
  if (auth?.status === 'connected' && auth.sharing) {
    return (
      <span style={{ ...badgeStyle, color: 'var(--color-success, #167A4A)' }}>
        <StatusDot color="var(--color-success)" />
        ChatGPT Pro/Plus kết nối
      </span>
    );
  }
  if (auth?.status === 'connected') {
    return (
      <span style={{ ...badgeStyle, color: 'var(--color-warning)' }}>
        <StatusDot color="var(--color-warning)" />
        Chưa cấp quyền gói
      </span>
    );
  }
  return (
    <span style={{ ...badgeStyle, color: 'var(--color-text-muted, #64748B)' }}>
      <StatusDot color="#CBD5E1" />
      Chưa kết nối ChatGPT
    </span>
  );
}
