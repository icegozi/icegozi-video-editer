import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Dialog,
  ConfirmDialog,
  Progress,
  Badge,
  KeyboardShortcutHint,
} from '../../src/editor/components/ui';

describe('Phase 6: Feedback, Dialogs, Accessibility (UI-12, UI-13)', () => {
  describe('Dialog Accessibility & Structure', () => {
    it('returns null when isOpen is false', () => {
      const html = renderToStaticMarkup(
        <Dialog isOpen={false} onClose={() => {}} title="Test Modal">
          <div>Content</div>
        </Dialog>
      );
      expect(html).toBe('');
    });

    it('renders with dialog role, aria-modal, and labelledby when open', () => {
      const html = renderToStaticMarkup(
        <Dialog
          isOpen={true}
          onClose={() => {}}
          title="Xuất video thành phẩm"
          description="Mô tả cấu hình"
        >
          <div>Dialog Content</div>
        </Dialog>
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('aria-labelledby="dialog-title"');
      expect(html).toContain('aria-describedby="dialog-description"');
      expect(html).toContain('Xuất video thành phẩm');
      expect(html).toContain('Dialog Content');
    });
  });

  describe('ConfirmDialog', () => {
    it('renders with alertdialog role and danger styling when variant is danger', () => {
      const html = renderToStaticMarkup(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Xác nhận xóa scene"
          message="Hành động này không thể hoàn tác"
          isDestructive={true}
          confirmLabel="Xóa ngay"
          cancelLabel="Hủy bỏ"
        />
      );
      expect(html).toContain('role="alertdialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('Xác nhận xóa scene');
      expect(html).toContain('Hành động này không thể hoàn tác');
      expect(html).toContain('Xóa ngay');
      expect(html).toContain('Hủy bỏ');
      expect(html).toContain('var(--color-danger');
    });
  });

  describe('Progress Feedback', () => {
    it('clamps percentage between 0 and 100 with progressbar role', () => {
      const htmlLow = renderToStaticMarkup(<Progress value={-10} showPercent />);
      expect(htmlLow).toContain('role="progressbar"');
      expect(htmlLow).toContain('aria-valuenow="0"');
      expect(htmlLow).toContain('0%');

      const htmlHigh = renderToStaticMarkup(<Progress value={150} showPercent />);
      expect(htmlHigh).toContain('aria-valuenow="100"');
      expect(htmlHigh).toContain('100%');
    });

    it('displays label and tabular percent readout', () => {
      const html = renderToStaticMarkup(
        <Progress value={65} label="Đang kết xuất..." showPercent />
      );
      expect(html).toContain('Đang kết xuất...');
      expect(html).toContain('65%');
      expect(html).toContain('tabular-nums');
    });
  });

  describe('Autosave Status Badges', () => {
    it('renders distinct semantic tokens for saved, saving, dirty and error states', () => {
      const savedHtml = renderToStaticMarkup(<Badge variant="success">Đã lưu</Badge>);
      expect(savedHtml).toContain('Đã lưu');
      expect(savedHtml).toContain('var(--color-success');

      const savingHtml = renderToStaticMarkup(<Badge variant="brand">Đang lưu…</Badge>);
      expect(savingHtml).toContain('Đang lưu…');
      expect(savingHtml).toContain('var(--color-primary');

      const dirtyHtml = renderToStaticMarkup(<Badge variant="warning">Chưa lưu (Ctrl+S)</Badge>);
      expect(dirtyHtml).toContain('Chưa lưu (Ctrl+S)');
      expect(dirtyHtml).toContain('var(--color-warning');

      const errorHtml = renderToStaticMarkup(<Badge variant="danger">Lỗi lưu</Badge>);
      expect(errorHtml).toContain('Lỗi lưu');
      expect(errorHtml).toContain('var(--color-danger');
    });
  });

  describe('Keyboard Shortcut Hints', () => {
    it('renders readable keyboard keys with kbd tags', () => {
      const html = renderToStaticMarkup(<KeyboardShortcutHint shortcut="Ctrl+S" />);
      expect(html).toContain('<kbd');
      expect(html).toContain('Ctrl');
      expect(html).toContain('S');
    });
  });
});
