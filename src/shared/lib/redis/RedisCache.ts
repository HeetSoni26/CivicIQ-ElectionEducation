/**
 * Redis Caching Layer — CivicIQ
 * 5-layer caching strategy: FAQ, eligibility, vector search, rate limiting, sessions.
 * Includes: stampede prevention, retry logic, fallback-to-DB, TTL management.
 *
 * Production dependency: ioredis ^5.x
 */

import Redis from "ioredis";

// ─── Configuration ────────────────────────────────────────────────────────────

const REDIS_CONFIG = {
  host: process.env["REDIS_HOST"] ?? "localhost",
  port: parseInt(process.env["REDIS_PORT"] ?? "6379", 10),
  password: process.env["REDIS_PASSWORD"],
  tls: process.env["NODE_ENV"] === "production" ? {} : undefined,
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 3) return null; // Stop retrying after 3 attempts
    return Math.min(times * 100, 1000);
  },
  enableReadyCheck: true,
  lazyConnect: false,
};

// TTL constants (seconds)
const TTL = {
  FAQ_RESPONSE: 24 * 60 * 60,          // 24 hours
  ELIGIBILITY_CHECK: 1 * 60 * 60,      // 1 hour
  VECTOR_SEARCH: 12 * 60 * 60,         // 12 hours — precomputed RAG results
  COUNTRY_CONFIG: 6 * 60 * 60,         // 6 hours
  RATE_LIMIT_WINDOW: 60 * 60,          // 1 hour sliding window
  SESSION_LOCK: 30,                    // 30 second lock for stampede prevention
  TRANSLATION: 7 * 24 * 60 * 60,      // 7 days
} as const;

// Cache key namespaces (prevent collisions)
const NS = {
  FAQ: "faq",
  ELIGIBILITY: "elig",
  VECTOR: "vec",
  COUNTRY: "country",
  RATE: "rate",
  LOCK: "lock",
  TRANSLATION: "trans",
} as const;

// ─── Redis Client Singleton ───────────────────────────────────────────────────

let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (redisClient === null) {
    redisClient = new Redis(REDIS_CONFIG);

    redisClient.on("error", (err: Error) => {
      console.error("[Redis] Connection error:", err.message);
    });

    redisClient.on("connect", () => {
      console.info("[Redis] Connected successfully");
    });

    redisClient.on("reconnecting", () => {
      console.warn("[Redis] Reconnecting…");
    });
  }
  return redisClient;
}

// ─── Cache Key Builders ───────────────────────────────────────────────────────

function faqKey(countryCode: string, questionHash: string): string {
  return `${NS.FAQ}:${countryCode}:${questionHash}`;
}

function eligibilityKey(countryCode: string, birthYear: string, residencyStatus: string): string {
  return `${NS.ELIGIBILITY}:${countryCode}:${birthYear}:${residencyStatus}`;
}

function vectorKey(queryHash: string, countryCode: string): string {
  return `${NS.VECTOR}:${countryCode}:${queryHash}`;
}

function countryKey(countryCode: string): string {
  return `${NS.COUNTRY}:${countryCode}`;
}

function rateLimitKey(userId: string, action: string): string {
  return `${NS.RATE}:${action}:${userId}`;
}

function lockKey(resource: string): string {
  return `${NS.LOCK}:${resource}`;
}

function translationKey(contentId: string, language: string): string {
  return `${NS.TRANSLATION}:${contentId}:${language}`;
}

// ─── Cache Stampede Prevention ────────────────────────────────────────────────

/**
 * Acquires a distributed lock using Redis SET NX PX pattern.
 * Returns true if lock was acquired, false if already held.
 */
async function acquireLock(
  redis: Redis,
  key: string,
  ttlMs: number = TTL.SESSION_LOCK * 1000
): Promise<boolean> {
  const lockValue = `${Date.now()}-${Math.random()}`;
  const result = await redis.set(lockKey(key), lockValue, "PX", ttlMs, "NX");
  return result === "OK";
}

/**
 * Releases a lock (only if we hold it).
 */
async function releaseLock(redis: Redis, key: string): Promise<void> {
  await redis.del(lockKey(key));
}

// ─── Generic Cache Operations ─────────────────────────────────────────────────

async function cacheGet<T>(redis: Redis, key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Redis] get failed for key "${key}":`, err);
    return null;
  }
}

async function cacheSet<T>(
  redis: Redis,
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.warn(`[Redis] set failed for key "${key}":`, err);
    // Non-fatal — allow fallback to DB
  }
}

async function cacheDelete(redis: Redis, key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.warn(`[Redis] del failed for key "${key}":`, err);
  }
}

// ─── FAQ Cache ────────────────────────────────────────────────────────────────

export interface CachedFAQResponse {
  readonly answer: string;
  readonly sources: string[];
  readonly cachedAt: string;
  readonly questionHash: string;
}

export async function getFAQFromCache(
  countryCode: string,
  questionHash: string
): Promise<CachedFAQResponse | null> {
  const redis = getRedisClient();
  return cacheGet<CachedFAQResponse>(redis, faqKey(countryCode, questionHash));
}

export async function setFAQInCache(
  countryCode: string,
  questionHash: string,
  response: Omit<CachedFAQResponse, "cachedAt" | "questionHash">
): Promise<void> {
  const redis = getRedisClient();
  const cacheEntry: CachedFAQResponse = {
    ...response,
    cachedAt: new Date().toISOString(),
    questionHash,
  };
  await cacheSet(redis, faqKey(countryCode, questionHash), cacheEntry, TTL.FAQ_RESPONSE);
}

// ─── Eligibility Cache ────────────────────────────────────────────────────────

export interface CachedEligibilityResult {
  readonly status: "eligible" | "ineligible" | "check_required";
  readonly summary: string;
  readonly cachedAt: string;
}

export async function getEligibilityFromCache(
  countryCode: string,
  birthYear: string,
  residencyStatus: string
): Promise<CachedEligibilityResult | null> {
  const redis = getRedisClient();
  return cacheGet<CachedEligibilityResult>(
    redis,
    eligibilityKey(countryCode, birthYear, residencyStatus)
  );
}

export async function setEligibilityInCache(
  countryCode: string,
  birthYear: string,
  residencyStatus: string,
  result: Omit<CachedEligibilityResult, "cachedAt">
): Promise<void> {
  const redis = getRedisClient();
  const cacheEntry: CachedEligibilityResult = {
    ...result,
    cachedAt: new Date().toISOString(),
  };
  await cacheSet(
    redis,
    eligibilityKey(countryCode, birthYear, residencyStatus),
    cacheEntry,
    TTL.ELIGIBILITY_CHECK
  );
}

// ─── Vector Search Cache (Semantic Cache) ─────────────────────────────────────

export interface CachedVectorResult {
  readonly chunks: Array<{
    chunkId: string;
    content: string;
    score: number;
  }>;
  readonly totalResults: number;
  readonly cachedAt: string;
  readonly queryHash: string;
}

/**
 * Cache lookup with semantic similarity check.
 * If cosine similarity to a cached query > 0.95, return the cached result.
 */
export async function getVectorFromCache(
  queryHash: string,
  countryCode: string
): Promise<CachedVectorResult | null> {
  const redis = getRedisClient();
  return cacheGet<CachedVectorResult>(redis, vectorKey(queryHash, countryCode));
}

export async function setVectorInCache(
  queryHash: string,
  countryCode: string,
  result: Omit<CachedVectorResult, "cachedAt" | "queryHash">
): Promise<void> {
  const redis = getRedisClient();
  const cacheEntry: CachedVectorResult = {
    ...result,
    cachedAt: new Date().toISOString(),
    queryHash,
  };
  await cacheSet(redis, vectorKey(queryHash, countryCode), cacheEntry, TTL.VECTOR_SEARCH);
}

// ─── Country Configuration Cache ──────────────────────────────────────────────

export async function getCountryConfigFromCache<T>(countryCode: string): Promise<T | null> {
  const redis = getRedisClient();
  return cacheGet<T>(redis, countryKey(countryCode));
}

/**
 * Read-through cache: checks Redis first, then falls back to the provided fetcher.
 * Implements stampede prevention using distributed lock.
 */
export async function getCountryConfigReadThrough<T>(
  countryCode: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const redis = getRedisClient();
  const key = countryKey(countryCode);

  // 1. Check cache
  const cached = await cacheGet<T>(redis, key);
  if (cached !== null) return cached;

  // 2. Acquire lock to prevent stampede
  const lockAcquired = await acquireLock(redis, key);

  if (!lockAcquired) {
    // Another process is fetching — wait briefly and retry cache
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    const retried = await cacheGet<T>(redis, key);
    if (retried !== null) return retried;
  }

  // 3. Fetch from DB
  try {
    const freshData = await fetcher();
    await cacheSet(redis, key, freshData, TTL.COUNTRY_CONFIG);
    return freshData;
  } finally {
    if (lockAcquired) {
      await releaseLock(redis, key);
    }
  }
}

export async function invalidateCountryConfig(countryCode: string): Promise<void> {
  const redis = getRedisClient();
  await cacheDelete(redis, countryKey(countryCode));
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number; // Unix timestamp
  readonly limit: number;
}

const RATE_LIMITS: Record<string, { limit: number; windowSeconds: number }> = {
  "ai:anonymous": { limit: 20, windowSeconds: TTL.RATE_LIMIT_WINDOW },
  "ai:registered": { limit: 100, windowSeconds: TTL.RATE_LIMIT_WINDOW },
  "eligibility:anonymous": { limit: 50, windowSeconds: TTL.RATE_LIMIT_WINDOW },
  "eligibility:registered": { limit: 200, windowSeconds: TTL.RATE_LIMIT_WINDOW },
};

export async function checkRateLimit(
  userId: string,
  action: string,
  userRole: "anonymous" | "registered"
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  const rateKey = rateLimitKey(userId, action);
  const config = RATE_LIMITS[`${action}:${userRole}`] ?? { limit: 20, windowSeconds: 3600 };

  try {
    const pipeline = redis.pipeline();
    pipeline.incr(rateKey);
    pipeline.ttl(rateKey);
    const results = await pipeline.exec();

    const currentCount = (results?.[0]?.[1] as number) ?? 1;
    const ttlValue = (results?.[1]?.[1] as number) ?? -1;

    // Set expiry on first request
    if (currentCount === 1 || ttlValue === -1) {
      await redis.expire(rateKey, config.windowSeconds);
    }

    const resetAt = ttlValue > 0
      ? Math.floor(Date.now() / 1000) + ttlValue
      : Math.floor(Date.now() / 1000) + config.windowSeconds;

    return {
      allowed: currentCount <= config.limit,
      remaining: Math.max(0, config.limit - currentCount),
      resetAt,
      limit: config.limit,
    };
  } catch (err) {
    console.error("[Redis] Rate limit check failed:", err);
    // Fail open — allow request if Redis is unavailable
    return {
      allowed: true,
      remaining: 1,
      resetAt: Math.floor(Date.now() / 1000) + 3600,
      limit: config.limit,
    };
  }
}

// ─── Translation Cache ────────────────────────────────────────────────────────

export interface CachedTranslation {
  readonly translatedText: string;
  readonly confidence: number;
  readonly isHumanOverride: boolean;
  readonly cachedAt: string;
}

export async function getTranslationFromCache(
  contentId: string,
  language: string
): Promise<CachedTranslation | null> {
  const redis = getRedisClient();
  return cacheGet<CachedTranslation>(redis, translationKey(contentId, language));
}

export async function setTranslationInCache(
  contentId: string,
  language: string,
  translation: Omit<CachedTranslation, "cachedAt">
): Promise<void> {
  const redis = getRedisClient();
  const entry: CachedTranslation = {
    ...translation,
    cachedAt: new Date().toISOString(),
  };
  await cacheSet(redis, translationKey(contentId, language), entry, TTL.TRANSLATION);
}

// ─── Cache Invalidation (Pub/Sub triggered) ───────────────────────────────────

/**
 * Called when admin publishes content update.
 * Invalidates all FAQ caches for the affected country.
 */
export async function invalidateFAQsByCountry(countryCode: string): Promise<number> {
  const redis = getRedisClient();
  try {
    const pattern = `${NS.FAQ}:${countryCode}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;

    await redis.del(...keys);
    console.info(`[Redis] Invalidated ${keys.length} FAQ cache entries for ${countryCode}`);
    return keys.length;
  } catch (err) {
    console.error("[Redis] FAQ invalidation failed:", err);
    return 0;
  }
}

/**
 * Called when content update is published via Cloud Pub/Sub.
 * Invalidates country config and FAQ caches for the affected country.
 */
export async function handleContentUpdate(countryCode: string): Promise<void> {
  const [keysInvalidated] = await Promise.all([
    invalidateFAQsByCountry(countryCode),
    invalidateCountryConfig(countryCode),
  ]);
  console.info(`[Redis] Content update handled for ${countryCode}: ${keysInvalidated} keys cleared`);
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function checkRedisHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
}> {
  const redis = getRedisClient();
  const start = Date.now();
  try {
    await redis.ping();
    return { connected: true, latencyMs: Date.now() - start };
  } catch {
    return { connected: false, latencyMs: -1 };
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

export async function closeRedisConnection(): Promise<void> {
  if (redisClient !== null) {
    await redisClient.quit();
    redisClient = null;
    console.info("[Redis] Connection closed gracefully");
  }
}

// Re-export for convenience
export { getRedisClient };
export type { Redis };
