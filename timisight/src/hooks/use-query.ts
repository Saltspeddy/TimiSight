import { useCallback, useEffect, useState } from 'react';

// Load something async for a screen, with loading / error state, a manual reload and
// optional polling (used for the chat). `key` says WHAT is being loaded: change it and the
// data is fetched again. `load` is a fresh closure every render, so it is deliberately not
// a dependency; the key stands in for it.
export function useQuery<T>(key: string, load: () => Promise<T>, pollMs?: number) {
  const [state, setState] = useState<{ data: T | null; error: unknown; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const data = await load();
        if (active) setState({ data, error: null, loading: false });
      } catch (error) {
        // Keep showing the last good data if a refresh fails.
        if (active) setState((s) => ({ data: s.data, error, loading: false }));
      }
    };
    void run();
    const timer = pollMs ? setInterval(() => void run(), pollMs) : null;
    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick, pollMs]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    setTick((n) => n + 1);
  }, []);

  return { ...state, reload };
}
