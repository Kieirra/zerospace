import { describe, expect, it } from 'vitest';
import { toEditorShortcut } from './use-editor-shortcuts.helpers.ts';

const key = (value: string, modifiers: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {}) => ({
  key: value,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...modifiers,
});

describe('Editor shortcuts', () => {
  it('should remove on Delete and Backspace, clear on Escape', () => {
    expect(toEditorShortcut(key('Delete'))).toBe('remove');
    expect(toEditorShortcut(key('Backspace'))).toBe('remove');
    expect(toEditorShortcut(key('Escape'))).toBe('clear');
  });

  it('should copy, paste and duplicate with Ctrl or Cmd, whatever the case', () => {
    expect(toEditorShortcut(key('c', { ctrlKey: true }))).toBe('copy');
    expect(toEditorShortcut(key('V', { metaKey: true }))).toBe('paste');
    expect(toEditorShortcut(key('d', { ctrlKey: true }))).toBe('duplicate');
  });

  it('should leave the other keys, Alt and Ctrl + Shift to others', () => {
    expect(toEditorShortcut(key('c'))).toBeNull();
    expect(toEditorShortcut(key('z', { ctrlKey: true }))).toBeNull();
    expect(toEditorShortcut(key('Delete', { ctrlKey: true }))).toBeNull();
    expect(toEditorShortcut(key('Delete', { altKey: true }))).toBeNull();
    expect(toEditorShortcut(key('c', { ctrlKey: true, shiftKey: true }))).toBeNull();
  });
});
