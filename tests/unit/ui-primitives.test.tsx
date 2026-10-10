import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Button,
  IconButton,
  Input,
  TextArea,
  NumberInput,
  Select,
  Checkbox,
  Switch,
  Slider,
  Tabs,
  Badge,
  Progress,
  Skeleton,
  EmptyState,
  ErrorState,
  Separator,
  KeyboardShortcutHint,
  TimecodeInput,
  formatFrameToTimecode,
  parseTimecodeToFrame,
  Dialog,
  ConfirmDialog,
} from '../../src/editor/components/ui';

describe('UI Primitives & Design System (Phase 1 / UI-01, UI-02, UI-03)', () => {
  describe('Button', () => {
    it('renders default secondary variant', () => {
      const html = renderToStaticMarkup(<Button>Click Me</Button>);
      expect(html).toContain('Click Me');
      expect(html).toContain('button');
    });

    it('renders primary variant with proper styling and attributes', () => {
      const html = renderToStaticMarkup(<Button variant="primary">Submit</Button>);
      expect(html).toContain('Submit');
      expect(html).toContain('var(--color-primary, #3568E8)');
    });

    it('renders loading state with disabled attribute, spinner and aria-busy', () => {
      const html = renderToStaticMarkup(<Button loading>Saving</Button>);
      expect(html).toContain('disabled=""');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('spin-animation');
    });

    it('renders disabled state with not-allowed cursor and disabled attribute', () => {
      const html = renderToStaticMarkup(<Button disabled>Disabled</Button>);
      expect(html).toContain('disabled=""');
      expect(html).toContain('not-allowed');
    });

    it('renders with icon prefix', () => {
      const html = renderToStaticMarkup(
        <Button icon={<span id="test-icon">*</span>}>With Icon</Button>
      );
      expect(html).toContain('id="test-icon"');
      expect(html).toContain('With Icon');
    });
  });

  describe('IconButton', () => {
    it('renders accessible label via title and aria-label', () => {
      const html = renderToStaticMarkup(
        <IconButton icon={<span>X</span>} label="Close window" />
      );
      expect(html).toContain('title="Close window"');
      expect(html).toContain('aria-label="Close window"');
    });

    it('renders active state with accent background', () => {
      const html = renderToStaticMarkup(
        <IconButton icon={<span>*</span>} label="Active Tool" active />
      );
      expect(html).toContain('var(--color-primary, #3568E8)');
    });

    it('renders disabled state', () => {
      const html = renderToStaticMarkup(
        <IconButton icon={<span>*</span>} label="Disabled" disabled />
      );
      expect(html).toContain('disabled=""');
    });
  });

  describe('Input', () => {
    it('renders input with label and id association', () => {
      const html = renderToStaticMarkup(<Input label="Project Name" defaultValue="My Video" />);
      expect(html).toContain('for="input-project-name"');
      expect(html).toContain('id="input-project-name"');
    });

    it('renders error state with aria-invalid and alert role', () => {
      const html = renderToStaticMarkup(
        <Input label="Email" error="Email không hợp lệ" />
      );
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('role="alert"');
      expect(html).toContain('Email không hợp lệ');
    });

    it('renders tabular nums when tabular is true', () => {
      const html = renderToStaticMarkup(<Input tabular defaultValue="100" />);
      expect(html).toContain('tabular-nums');
      expect(html).toContain('JetBrains Mono');
    });
  });

  describe('TextArea', () => {
    it('renders textarea with label, hint, and error', () => {
      const html = renderToStaticMarkup(
        <TextArea label="Description" hint="Tối đa 500 ký tự" error="Bắt buộc nhập" />
      );
      expect(html).toContain('Description');
      expect(html).toContain('Bắt buộc nhập');
      expect(html).toContain('role="alert"');
    });
  });

  describe('NumberInput', () => {
    it('renders number input with unit suffix', () => {
      const html = renderToStaticMarkup(
        <NumberInput value={120} min={1} max={500} unit="frames" onChange={() => {}} />
      );
      expect(html).toContain('type="number"');
      expect(html).toContain('frames');
      expect(html).toContain('value="120"');
    });
  });

  describe('Select', () => {
    it('renders options correctly with label', () => {
      const options = [
        { value: '16:9', label: '16:9 Ngang' },
        { value: '9:16', label: '9:16 Dọc' },
      ];
      const html = renderToStaticMarkup(
        <Select label="Tỷ lệ khung hình" options={options} defaultValue="16:9" />
      );
      expect(html).toContain('16:9 Ngang');
      expect(html).toContain('9:16 Dọc');
      expect(html).toContain('Tỷ lệ khung hình');
    });
  });

  describe('Checkbox & Switch', () => {
    it('renders accessible Checkbox with aria-checked', () => {
      const html = renderToStaticMarkup(
        <Checkbox checked={true} label="Bật Snapping" onChange={() => {}} />
      );
      expect(html).toContain('role="checkbox"');
      expect(html).toContain('aria-checked="true"');
      expect(html).toContain('Bật Snapping');
    });

    it('renders accessible Switch with role switch', () => {
      const html = renderToStaticMarkup(
        <Switch checked={false} label="Hiển thị vùng an toàn" onChange={() => {}} />
      );
      expect(html).toContain('role="switch"');
      expect(html).toContain('aria-checked="false"');
      expect(html).toContain('Hiển thị vùng an toàn');
    });
  });

  describe('Slider', () => {
    it('renders slider with min, max, value and value label', () => {
      const html = renderToStaticMarkup(
        <Slider value={75} min={0} max={100} showValue unit="%" label="Độ mờ" onChange={() => {}} />
      );
      expect(html).toContain('type="range"');
      expect(html).toContain('aria-valuenow="75"');
      expect(html).toContain('75%');
      expect(html).toContain('Độ mờ');
    });
  });

  describe('Tabs', () => {
    it('renders tab list and marks active tab as aria-selected', () => {
      const tabs = [
        { id: 'ai', label: 'AI Studio' },
        { id: 'assets', label: 'Assets & Scenes' },
      ];
      const html = renderToStaticMarkup(
        <Tabs tabs={tabs} activeTab="ai" onChange={() => {}} />
      );
      expect(html).toContain('role="tablist"');
      expect(html).toContain('role="tab"');
      expect(html).toContain('aria-selected="true"');
      expect(html).toContain('AI Studio');
    });
  });

  describe('Badge & Progress & Skeleton', () => {
    it('renders Badge with semantic variants', () => {
      const html = renderToStaticMarkup(<Badge variant="success">Hoàn thành</Badge>);
      expect(html).toContain('Hoàn thành');
      expect(html).toContain('var(--color-success, #167A4A)');
    });

    it('renders Progress with determinate and indeterminate values', () => {
      const determinate = renderToStaticMarkup(<Progress value={45} showPercent />);
      expect(determinate).toContain('role="progressbar"');
      expect(determinate).toContain('aria-valuenow="45"');
      expect(determinate).toContain('45%');

      const indeterminate = renderToStaticMarkup(<Progress />);
      expect(indeterminate).toContain('role="progressbar"');
      expect(indeterminate).not.toContain('aria-valuenow="45"');
    });

    it('renders Skeleton with aria-hidden', () => {
      const html = renderToStaticMarkup(<Skeleton width={120} height={20} />);
      expect(html).toContain('aria-hidden="true"');
    });
  });

  describe('Timecode Formatting & Input', () => {
    it('formats frame numbers to MM:SS:FF accurately at 30 fps', () => {
      expect(formatFrameToTimecode(0, 30)).toBe('00:00:00');
      expect(formatFrameToTimecode(15, 30)).toBe('00:00:15');
      expect(formatFrameToTimecode(30, 30)).toBe('00:01:00');
      expect(formatFrameToTimecode(1800, 30)).toBe('01:00:00');
      expect(formatFrameToTimecode(1845, 30)).toBe('01:01:15');
    });

    it('parses MM:SS:FF strings back to frame numbers', () => {
      expect(parseTimecodeToFrame('00:00:00', 30)).toBe(0);
      expect(parseTimecodeToFrame('00:01:00', 30)).toBe(30);
      expect(parseTimecodeToFrame('01:00:00', 30)).toBe(1800);
      expect(parseTimecodeToFrame('01:01:15', 30)).toBe(1845);
      expect(parseTimecodeToFrame('invalid', 30)).toBeNull();
    });

    it('renders TimecodeInput with tabular timecode', () => {
      const html = renderToStaticMarkup(
        <TimecodeInput frame={45} fps={30} onChange={() => {}} />
      );
      expect(html).toContain('value="00:01:15"');
      expect(html).toContain('tabular-nums');
    });
  });

  describe('Dialog & ConfirmDialog', () => {
    it('renders accessible Dialog modal when open', () => {
      const html = renderToStaticMarkup(
        <Dialog isOpen={true} onClose={() => {}} title="Xuất Video">
          <p>Nội dung modal</p>
        </Dialog>
      );
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('Xuất Video');
      expect(html).toContain('Nội dung modal');
    });

    it('returns null when Dialog is closed', () => {
      const html = renderToStaticMarkup(
        <Dialog isOpen={false} onClose={() => {}} title="Closed">
          <p>Hidden</p>
        </Dialog>
      );
      expect(html).toBe('');
    });

    it('renders ConfirmDialog with destructive action styling', () => {
      const html = renderToStaticMarkup(
        <ConfirmDialog
          isOpen={true}
          onClose={() => {}}
          onConfirm={() => {}}
          title="Xóa cảnh quay"
          message="Bạn có chắc chắn muốn xóa không?"
          isDestructive={true}
          confirmLabel="Xóa vĩnh viễn"
        />
      );
      expect(html).toContain('Xóa cảnh quay');
      expect(html).toContain('Bạn có chắc chắn muốn xóa không?');
      expect(html).toContain('Xóa vĩnh viễn');
      expect(html).toContain('var(--color-danger, #DC2626)');
    });
  });

  describe('EmptyState & ErrorState', () => {
    it('renders EmptyState with title and description', () => {
      const html = renderToStaticMarkup(
        <EmptyState title="Chưa có cảnh nào" description="Kéo thả media từ thư viện vào đây" />
      );
      expect(html).toContain('Chưa có cảnh nào');
      expect(html).toContain('Kéo thả media từ thư viện vào đây');
    });

    it('renders ErrorState with role alert and retry action', () => {
      const html = renderToStaticMarkup(
        <ErrorState message="Lỗi kết nối AI assistant" onRetry={() => {}} />
      );
      expect(html).toContain('role="alert"');
      expect(html).toContain('Lỗi kết nối AI assistant');
      expect(html).toContain('Thử lại');
    });
  });
});
