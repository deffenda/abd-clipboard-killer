type MetricBucket = {
  count: number;
  errors: number;
  totalDurationMs: number;
};

const buckets = new Map<string, MetricBucket>();

export const recordMetric = (name: string, durationMs: number, errored: boolean): void => {
  const existing = buckets.get(name) ?? {
    count: 0,
    errors: 0,
    totalDurationMs: 0
  };

  existing.count += 1;
  existing.totalDurationMs += durationMs;
  if (errored) {
    existing.errors += 1;
  }

  buckets.set(name, existing);
};

export const getMetricsSnapshot = () => {
  return Array.from(buckets.entries()).map(([name, bucket]) => ({
    name,
    count: bucket.count,
    errors: bucket.errors,
    avgDurationMs:
      bucket.count === 0 ? 0 : Number((bucket.totalDurationMs / bucket.count).toFixed(2))
  }));
};
