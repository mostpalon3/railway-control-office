import { Redis } from "@upstash/redis";

// Singleton — reused across requests within a Lambda instance
declare global {
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
}

/**
 * Returns an Upstash Redis client, or null if env vars are not set.
 * Null means the app degrades gracefully — no caching, but fully functional.
 * Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local
 * (and in Vercel project settings).
 */
export function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!global._redis) {
    global._redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return global._redis;
}

/** Centralised cache key names */
export const KEYS = {
  /** Cached Firebase auth uid keyed by SHA-256 of the session cookie */
  auth:    (cookieHash: string) => `rco:auth:${cookieHash}`,
  /** Cached { uid, email } keyed by SHA-256 of the session cookie */
  authUser:(cookieHash: string) => `rco:authuser:${cookieHash}`,
  /** Cached entries array keyed by MongoDB session id */
  entries: (sessionId:  string) => `rco:entries:${sessionId}`,
};
