import React, { useState } from 'react';
import { Check, X, AlertTriangle, Code2, Layers } from 'lucide-react';
import { Button } from '../ui/Button';
import type { ProjectProposal } from '../../../application/assistant/assistant.contracts';

interface ProposalCardProps {
  proposal: ProjectProposal;
  isApplied: boolean;
  onApply: (proposal: ProjectProposal) => void;
  onDismiss: (proposal: ProjectProposal) => void;
  disabled?: boolean;
}

export const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  isApplied,
  onApply,
  onDismiss,
  disabled = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <article
      style={{
        margin: '10px 0',
        padding: '12px',
        backgroundColor: isApplied ? 'var(--color-surface, #FFFFFF)' : 'var(--color-primary-subtle, #EEF3FF)',
        border: `1px solid ${isApplied ? 'var(--color-success, #167A4A)' : 'var(--color-primary, #3568E8)'}`,
        borderRadius: 'var(--radius-card, 12px)',
        boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.05))',
      }}
      data-testid="proposal-card"
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Layers size={14} color={isApplied ? 'var(--color-success, #167A4A)' : 'var(--color-primary, #3568E8)'} />
          <strong style={{ fontSize: '13px', color: 'var(--color-text-primary, #17233B)' }}>
            Kế hoạch chỉnh sửa
          </strong>
        </div>

        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: 600,
            backgroundColor: isApplied ? 'var(--color-success-subtle, #ECFDF5)' : 'var(--color-primary-subtle, #EEF3FF)',
            color: isApplied ? 'var(--color-success, #167A4A)' : 'var(--color-primary, #3568E8)',
          }}
        >
          {isApplied ? '✓ Đã áp dụng' : `Revision ${proposal.baseRevision}`}
        </span>
      </header>

      <p
        style={{
          fontSize: '13px',
          lineHeight: '1.45',
          color: 'var(--color-text-primary, #17233B)',
          margin: '0 0 8px 0',
        }}
      >
        {proposal.summary}
      </p>

      {/* Affected Scenes / Tracks */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '4px',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)' }}>
          Phạm vi:
        </span>
        {proposal.affected.length > 0 ? (
          proposal.affected.map((id) => (
            <span
              key={id}
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: 'var(--radius-controlSm, 6px)',
                backgroundColor: 'var(--color-surface, #FFFFFF)',
                border: '1px solid var(--color-border-subtle, #E2E8F0)',
                color: 'var(--color-text-secondary, #52627A)',
              }}
            >
              {id}
            </span>
          ))
        ) : (
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary, #52627A)' }}>
            Cập nhật toàn bộ {proposal.candidate.scenes.length} scene
          </span>
        )}
      </div>

      {/* Warnings */}
      {proposal.warnings && proposal.warnings.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            padding: '6px 8px',
            borderRadius: '6px',
            backgroundColor: '#FEF3C7',
            color: '#92400E',
            fontSize: '11px',
            marginBottom: '8px',
          }}
        >
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            {proposal.warnings.map((w, idx) => (
              <div key={idx}>{w}</div>
            ))}
          </div>
        </div>
      )}

      {/* Inspect Candidate Diff Toggle */}
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          color: 'var(--color-primary, #3568E8)',
          fontSize: '11px',
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '8px',
        }}
      >
        <Code2 size={12} />
        {showDetails ? 'Ẩn chi tiết snapshot dự kiến' : 'Xem chi tiết snapshot dự kiến'}
      </button>

      {showDetails && (
        <pre
          style={{
            maxHeight: '160px',
            overflowY: 'auto',
            padding: '8px',
            backgroundColor: 'var(--color-stage, #0F172A)',
            color: '#E2E8F0',
            fontSize: '11px',
            borderRadius: 'var(--radius-controlSm, 6px)',
            marginBottom: '8px',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        >
          {JSON.stringify(proposal.candidate, null, 2)}
        </pre>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <Button
          variant="primary"
          size="sm"
          disabled={disabled || isApplied}
          onClick={() => onApply(proposal)}
          icon={<Check size={13} />}
        >
          {isApplied ? 'Đã áp dụng' : 'Duyệt & Áp dụng'}
        </Button>

        {!isApplied && (
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => onDismiss(proposal)}
            icon={<X size={13} />}
          >
            Bỏ qua
          </Button>
        )}
      </div>
    </article>
  );
};
