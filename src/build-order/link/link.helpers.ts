import { HASH_KEY, LINK_TEXTS } from './link.constants.ts';

// Code after `#b=`, null when the hash holds none.
export const readBuildCode = (hash: string) => {
  const entry = hash
    .replace(/^#/, '')
    .split('&')
    .find((part) => part.startsWith(`${HASH_KEY}=`));
  const raw = entry?.slice(HASH_KEY.length + 1) ?? '';
  if (raw === '') return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    // Left as is: the decoding then reports an invalid link.
    return raw;
  }
};

export const toEditUrl = (code: string) => `/build-order/#${HASH_KEY}=${code}`;
export const toAbsoluteUrl = (path: string, origin: string) => `${origin}${path}`;

export const formatDataChangedText = (linkDataVersion: string, currentDataVersion: string) =>
  LINK_TEXTS.dataChanged.replace('{old}', linkDataVersion).replace('{current}', currentDataVersion);
