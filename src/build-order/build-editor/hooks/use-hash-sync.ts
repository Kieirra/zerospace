import { useEffect, useEffectEvent, useRef } from 'react';
import { encodeBuild } from '../../link/link.codec.ts';
import { readBuildCode, toEditUrl } from '../../link/link.helpers.ts';
import { HASH_SYNC_DELAY_MS } from '../build-editor.constants.ts';
import type { Build } from '../../build-order.types.ts';

// The URL is the only storage: `#b=` follows the build 300 ms after its last change, without a browser history entry.
// Another code in the address bar (a pasted link, Back, Forward) calls `onOutsideChange`: the editor reads it again.
export const useHashSync = (build: Build | null, onOutsideChange: () => void) => {
  const lastCode = useRef<string | null>(null);

  const handleHashChange = useEffectEvent(() => {
    const code = readBuildCode(window.location.hash);
    if (code === lastCode.current) return;
    lastCode.current = code;
    onOutsideChange();
  });

  useEffect(() => {
    lastCode.current = readBuildCode(window.location.hash);
    const listener = () => handleHashChange();
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);

  useEffect(() => {
    if (build === null) return;
    const timer = setTimeout(() => {
      const code = encodeBuild(build);
      if (code !== lastCode.current) history.replaceState(null, '', toEditUrl(code));
      lastCode.current = code;
    }, HASH_SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [build]);
};
