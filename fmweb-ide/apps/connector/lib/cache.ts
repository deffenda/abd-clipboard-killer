type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export class TtlCache<T> {
  private readonly maxEntries: number;
  private readonly store = new Map<string, CacheEntry<T>>();

  public constructor(maxEntries = 500) {
    this.maxEntries = Math.max(10, maxEntries);
  }

  public get(key: string): T | undefined {
    const item = this.store.get(key);

    if (item === undefined) {
      return undefined;
    }

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return item.value;
  }

  public set(key: string, value: T, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      this.evictOldest();
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + Math.max(1_000, ttlMs)
    });
  }

  public delete(key: string): void {
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }

  public keys(): string[] {
    return Array.from(this.store.keys());
  }

  private evictOldest(): void {
    const first = this.store.keys().next();
    if (!first.done) {
      this.store.delete(first.value);
    }
  }
}
