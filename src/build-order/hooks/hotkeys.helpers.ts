// Page shortcuts stay off while a field handles the keys itself (text, number, select) or a dialog is open.
export const isShortcutBlocked = (event: KeyboardEvent) => isTyping(event.target) || document.querySelector('dialog[open]') !== null;

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement && !NON_TEXT_INPUTS.includes(target.type)));

const NON_TEXT_INPUTS = ['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color'];
