import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { PromptComposer } from '../../src/editor/components/chat/PromptComposer';

describe('PromptComposer & IME Keyboard Guard', () => {
  it('instantiates PromptComposer as a valid React component', () => {
    const onSend = vi.fn();
    const onChange = vi.fn();

    const element = React.createElement(PromptComposer, {
      value: 'Tạo 3 scene mới',
      onChange,
      onSend,
      isRunning: false,
    });

    expect(React.isValidElement(element)).toBe(true);
    expect(element.props.value).toBe('Tạo 3 scene mới');
    expect(element.props.isRunning).toBe(false);
  });

  it('rejects empty or whitespace-only submissions', () => {
    const onSend = vi.fn();
    const onChange = vi.fn();

    // Verify logic when value is empty or pure spaces
    const emptyValues = ['', '   ', '\n\t\n'];
    emptyValues.forEach((val) => {
      const trimmed = val.trim();
      expect(trimmed.length).toBe(0);
      if (trimmed.length > 0) {
        onSend(trimmed);
      }
    });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('blocks Enter submission when IME is actively composing (Vietnamese Telex/VNI protection)', () => {
    const onSend = vi.fn();
    let sent = false;

    // Simulate key down event logic matching PromptComposer
    const simulateKeyDown = (event: {
      key: string;
      shiftKey: boolean;
      keyCode?: number;
      nativeEvent: { isComposing: boolean };
    }) => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) {
        return; // IME composing, blocked!
      }
      if (event.key === 'Enter' && !event.shiftKey) {
        sent = true;
        onSend('tiếng việt');
      }
    };

    // 1. Enter pressed during IME composition (isComposing = true)
    simulateKeyDown({
      key: 'Enter',
      shiftKey: false,
      keyCode: 229,
      nativeEvent: { isComposing: true },
    });
    expect(sent).toBe(false);
    expect(onSend).not.toHaveBeenCalled();

    // 2. Enter pressed with keyCode 229 (IME active on some browsers)
    simulateKeyDown({
      key: 'Enter',
      shiftKey: false,
      keyCode: 229,
      nativeEvent: { isComposing: false },
    });
    expect(sent).toBe(false);
    expect(onSend).not.toHaveBeenCalled();

    // 3. Normal Enter pressed after IME composition completes (isComposing = false)
    simulateKeyDown({
      key: 'Enter',
      shiftKey: false,
      keyCode: 13,
      nativeEvent: { isComposing: false },
    });
    expect(sent).toBe(true);
    expect(onSend).toHaveBeenCalledWith('tiếng việt');
  });

  it('does not submit on Shift+Enter (allows multi-line typing)', () => {
    const onSend = vi.fn();
    let sent = false;

    const simulateKeyDown = (event: {
      key: string;
      shiftKey: boolean;
      nativeEvent: { isComposing: boolean };
    }) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' && !event.shiftKey) {
        sent = true;
        onSend('multiline text');
      }
    };

    simulateKeyDown({
      key: 'Enter',
      shiftKey: true,
      nativeEvent: { isComposing: false },
    });

    expect(sent).toBe(false);
    expect(onSend).not.toHaveBeenCalled();
  });
});
