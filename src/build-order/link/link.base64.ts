// base64url (no padding) of UTF-8 text, with the browser and Node ≥ 22 built-ins only.

export const toBase64Url = (text: string) => {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// null when the text is not base64url or not valid UTF-8 (a link cut in the middle, for instance).
export const fromBase64Url = (value: string): string | null => {
  if (!BASE64_URL_PATTERN.test(value) || value.length % 4 === 1) return null;
  try {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
};

const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]*$/;
