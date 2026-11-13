import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  emptyLibrary,
  loadLibrary,
  type Library,
} from '../lib/library';

export function useLibrary() {
  const [library, setLibrary] = useState<Library>(emptyLibrary());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await loadLibrary();
    setLibrary(next);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadLibrary()
        .then((next) => {
          if (!active) return;
          setLibrary(next);
          setLoading(false);
        })
        .catch(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [])
  );

  return { library, loading, refresh };
}
