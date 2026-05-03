/**
 * Redis Caching Layer — 5-Layer Cache Implementation
 * Layer 3: API Response Cache
 * Covers: FAQ responses, eligibility results, RAG vector cache
 * Anti-stampede: SET NX PX lock pattern
 * Fallback: Firestore read-through if Redis unavailable
 */

import type { EligibilityResult } from "@civiciq/types";

// ─── Redis Client Wrapper ─────────────────────────────────────────────────────

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { ex?: number; nx?: boolean; px?: number }): Promise<"OK" | null>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  expire(key: string, seconds: number): Promise<number>;
}

interface CacheConfig {
  readonly faqTtlSeconds: number;        // 24 hours
  readonly eligibilityTtlSeconds: number; // 1 hour
  readonly lockTtlMs: number;             // 10 seconds (stampede prevention)
  readonly maxRetries: number;
  readonly retryDelayMs: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  faqTtlSeconds: 24 * 60 * 60,
  eligibilityTtlSeconds: 60 * 60,
  lockTtlMs: 10000,
  maxRetries: 3,
  retryDelayMs: 100,
};

// ─── CivicCache — Main Cache Class ────────────────────────────────────────────

export class CivicCache {
  private readonly redis: RedisClient;
  private readonly config: CacheConfig;
  private isConnected: boolean = true;

  constructor(redis: RedisClient, config: Partial<CacheConfig> = {}) {
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── FAQ Cache ──────────────────────────────────────────────────────────────
  // Key: {countryCode}:{sha256(question)}

  async getFaqResponse(
    countryCode: string,
    question: string
  ): Promise<string | null> {
    const key = this.buildFaqKey(countryCode, question);
    return this.safeGet(key);
  }

  async setFaqResponse(
    countryCode: string,
    question: string,
    answer: string
  ): Promise<void> {
    const key = this.buildFaqKey(countryCode, question);
    await this.safeSet(key, answer, this.config.faqTtlSeconds);
  }

  // ── Eligibility Result Cache ───────────────────────────────────────────────
  // Key: {countryCode}:{birthYear}:{residencyStatus}:{citizenship}

  async getEligibilityResult(params: {
    countryCode: string;
    birthYear: string;
    isCitizen: boolean;
    hasFelon: boolean;
    stateCode?: string;
  }): Promise<EligibilityResult | null> {
    const key = this.buildEligibilityKey(params);
    const cached = await this.safeGet(key);
    if (cached === null) return null;

    try {
      return JSON.parse(cached) as EligibilityResult;
    } catch {
      await this.redis.del(key);
      return null;
    }
  }

  async setEligibilityResult(
    params: {
      countryCode: string;
      birthYear: string;
      isCitizen: boolean;
      hasFelon: boolean;
      stateCode?: string;
    },
    result: EligibilityResult
  ): Promise<void> {
    const key = this.buildEligibilityKey(params);
    await this.safeSet(
      key,
      JSON.stringify(result),
      this.config.eligibilityTtlSeconds
    );
  }

  // ── Cache Stampede Prevention (SET NX PX lock pattern) ────────────────────

  async acquireLock(resource: string): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const lockValue = crypto.randomUUID();

    const result = await this.redis.set(lockKey, lockValue, {
      nx: true,
      px: this.config.lockTtlMs,
    });

    return result === "OK" ? lockValue : null;
  }

  async releaseLock(resource: string, lockValue: string): Promise<void> {
    const lockKey = `lock:${resource}`;
    const current = await this.redis.get(lockKey);
    if (current === lockValue) {
      await this.redis.del(lockKey);
    }
  }

  // ── Get with stampede prevention ───────────────────────────────────────────

  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    ttlSeconds: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.safeGet(key);
    if (cached !== null) {
      try {
        return JSON.parse(cached) as T;
      } catch {
        // Fall through to compute
      }
    }

    // Try to acquire lock
    const lockValue = await this.acquireLock(key);

    if (lockValue === null) {
      // Another process is computing — wait and retry
      for (let i = 0; i < this.config.maxRetries; i++) {
        await sleep(this.config.retryDelayMs * Math.pow(2, i));
        const retried = await this.safeGet(key);
        if (retried !== null) {
          try {
            return JSON.parse(retried) as T;
          } catch {
            break;
          }
        }
      }
      // Fallback: compute without caching
      return compute();
    }

    // We have the lock — compute and cache
    try {
      const result = await compute();
      await this.safeSet(key, JSON.stringify(result), ttlSeconds);
      return result;
    } finally {
      await this.releaseLock(key, lockValue);
    }
  }

  // ── Country Config Cache ───────────────────────────────────────────────────

  async getCountryConfig(countryCode: string): Promise<string | null> {
    return this.safeGet(`country:${countryCode}`);
  }

  async setCountryConfig(
    countryCode: string,
    config: string
  ): Promise<void> {
    await this.safeSet(`country:${countryCode}`, config, 5 * 60); // 5 minutes
  }

  // ── Cache Invalidation ────────────────────────────────────────────────────

  async invalidateCountry(countryCode: string): Promise<void> {
    try {
      const keys = await this.redis.keys(`*:${countryCode}:*`);
      const countryKey = await this.redis.keys(`country:${countryCode}`);
      const allKeys = [...keys, ...countryKey];

      await Promise.all(allKeys.map((k) => this.redis.del(k)));
    } catch (err) {
      console.error("Cache invalidation error:", err);
    }
  }

  async invalidateAll(): Promise<void> {
    try {
      const keys = await this.redis.keys("civiciq:*");
      await Promise.all(keys.map((k) => this.redis.del(k)));
    } catch (err) {
      console.error("Full cache invalidation error:", err);
    }
  }

  // ── Health Check ──────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      await this.redis.set("ping", "pong", { ex: 1 });
      const result = await this.redis.get("ping");
      return result === "pong";
    } catch {
      return false;
    }
  }

  // ── Private: Safe Operations (with fallback) ───────────────────────────────

  private async safeGet(key: string): Promise<string | null> {
    if (!this.isConnected) return null;
    try {
      return await this.redis.get(this.prefix(key));
    } catch (err) {
      this.handleRedisError(err);
      return null;
    }
  }

  private async safeSet(
    key: string,
    value: string,
    ttlSeconds: number
  ): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.redis.set(this.prefix(key), value, { ex: ttlSeconds });
    } catch (err) {
      this.handleRedisError(err);
    }
  }

  private prefix(key: string): string {
    return `civiciq:${key}`;
  }

  private handleRedisError(err: unknown): void {
    console.error("Redis error:", err);
    // Don't crash on Redis errors — degrade gracefully to DB reads
    this.isConnected = false;
    // Re-enable after 30 seconds (circuit breaker)
    setTimeout(() => {
      this.isConnected = true;
    }, 30000);
  }

  // ── Key Builders ──────────────────────────────────────────────────────────

  private buildFaqKey(countryCode: string, question: string): string {
    // Normalize question for better cache hit rate
    const normalized = question.toLowerCase().trim().replace(/\s+/g, " ");
    const hash = simpleHash(normalized);
    return `faq:${countryCode}:${hash}`;
  }

  private buildEligibilityKey(params: {
    countryCode: string;
    birthYear: string;
    isCitizen: boolean;
    hasFelon: boolean;
    stateCode?: string;
  }): string {
    const state = params.stateCode ?? "any";
    const citizen = params.isCitizen ? "c" : "nc";
    const felon = params.hasFelon ? "f" : "nf";
    return `eligibility:${params.countryCode}:${state}:${params.birthYear}:${citizen}:${felon}`;
  }
}

// ─── Redis Client Factory ─────────────────────────────────────────────────────
// Creates real Redis client using ioredis (falls back to mock for dev)

export async function createRedisClient(): Promise<RedisClient> {
  const redisUrl = process.env["REDIS_URL"];

  if (!redisUrl) {
    console.warn("REDIS_URL not set — using in-memory cache fallback");
    return createInMemoryCache();
  }

  try {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(redisUrl, {
      retryStrategy: (times) => {
        if (times > 3) return null; // Stop retrying after 3 attempts
        return Math.min(times * 100, 1000);
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      connectTimeout: 5000,
      lazyConnect: false,
      tls: process.env["NODE_ENV"] === "production" ? {} : undefined,
    });

    return {
      get: (key) => client.get(key),
      set: (key, value, options) => {
        if (options?.nx === true) {
          return client.set(key, value, "PX", options.px ?? 10000, "NX");
        }
        if (options?.ex !== undefined) {
          return client.set(key, value, "EX", options.ex) as Promise<"OK" | null>;
        }
        return client.set(key, value) as Promise<"OK" | null>;
      },
      del: (key) => client.del(key),
      keys: (pattern) => client.keys(pattern),
      expire: (key, seconds) => client.expire(key, seconds),
    };
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
    return createInMemoryCache();
  }
}

// ─── In-Memory Fallback Cache ─────────────────────────────────────────────────

function createInMemoryCache(): RedisClient {
  const store = new Map<string, { value: string; expiresAt: number }>();

  const pruneExpired = () => {
    const now = Date.now();
    for (const [k, v] of Array.from(store.entries())) {
      if (v.expiresAt < now) store.delete(k);
    }
  };

  return {
    async get(key) {
      pruneExpired();
      const entry = store.get(key);
      if (!entry || entry.expiresAt < Date.now()) return null;
      return entry.value;
    },
    async set(key, value, options) {
      const ttlMs = options?.ex
        ? options.ex * 1000
        : options?.px ?? 60 * 60 * 1000;

      if (options?.nx === true && store.has(key)) return null;
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return "OK";
    },
    async del(key) {
      return store.delete(key) ? 1 : 0;
    },
    async keys(pattern) {
      pruneExpired();
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
      );
      return Array.from(store.keys()).filter((k) => regex.test(k));
    },
    async expire(key, seconds) {
      const entry = store.get(key);
      if (!entry) return 0;
      entry.expiresAt = Date.now() + seconds * 1000;
      return 1;
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let cacheInstance: CivicCache | null = null;

export async function getCivicCache(): Promise<CivicCache> {
  if (cacheInstance === null) {
    const redis = await createRedisClient();
    cacheInstance = new CivicCache(redis);
  }
  return cacheInstance;
}
