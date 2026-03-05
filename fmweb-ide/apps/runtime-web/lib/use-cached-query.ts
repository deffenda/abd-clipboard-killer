"use client";

import { useEffect, useMemo, useState } from "react";

type CacheEntry<T> = {
  data: T;
  ts: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

export const useCachedQuery = <T>(key: string, fetcher: () => Promise<T>, ttlMs = 5_000) => {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useMemo(
    () => async () => {
      setLoading(true);
      try {
        const next = await fetcher();
        cache.set(key, { data: next, ts: Date.now() });
        setData(next);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    },
    [fetcher, key]
  );

  useEffect(() => {
    const cached = cache.get(key) as CacheEntry<T> | undefined;

    if (cached !== undefined && Date.now() - cached.ts < ttlMs) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    void refresh();
  }, [key, refresh, ttlMs]);

  return {
    data,
    error,
    loading,
    refresh
  };
};
