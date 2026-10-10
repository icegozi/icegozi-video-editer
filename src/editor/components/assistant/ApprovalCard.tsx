import React from 'react';
import { ShieldAlert, Check, X, Ban } from 'lucide-react';
import { Button } from '../ui/Button';

interface ApprovalCardProps {
  approval: {
    id: string;
    tool: string;
    description: string;
  };
  onDecision: (id: string, decision: 'accept' | 'decline' | 'cancel') => void;
  disabled?: boolean;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approval,
  onDecision,
  disabled = false,
}) => {
  return (
    <article
      style={{
        margin: '10px 0',
        padding: '12px',
        backgroundColor: '#FFFBEB',
        border: '1px solid #FCD34D',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
      data-testid="approval-card"
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '6px',
          color: '#92400E',
        }}
      >
        <ShieldAlert size={15} />
        <strong style={{ fontSize: '13px' }}>
          Yêu cầu phê duyệt hành động: {approval.tool}
        </strong>
      </header>

      <p
        style={{
          fontSize: '12px',
          lineHeight: '1.4',
          color: '#78350F',
          margin: '0 0 10px 0',
        }}
      >
        {approval.description}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Button
          variant="primary"
          size="sm"
          disabled={disabled}
          onClick={() => onDecision(approval.id, 'accept')}
          icon={<Check size={12} />}
        >
          Cho phép
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={() => onDecision(approval.id, 'decline')}
          icon={<X size={12} />}
        >
          Từ chối
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onDecision(approval.id, 'cancel')}
          icon={<Ban size={12} />}
        >
          Hủy tác vụ
        </Button>
      </div>
    </article>
  );
};
