import { useSyncExternalStore } from 'react';

import { T, type Lang, type Tr } from '@/constants/site-data';

// Tiny module-level store so the language selection is shared across all screens
// without pulling in a state library. Mirrors the web app's localStorage toggle.
let current: Lang = 'en';
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): Lang {
  return current;
}

export function setLang(next: Lang) {
  if (next === current) return;
  current = next;
  listeners.forEach((cb) => cb());
}

/** Returns [lang, t (translations for that lang), setLang]. */
export function useLang(): [Lang, Tr, (l: Lang) => void] {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [lang, T[lang], setLang];
}
