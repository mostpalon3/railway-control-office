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
  auth:      (cookieHash: string) => `rco:auth:${cookieHash}`,
  /** Cached { uid, email } keyed by SHA-256 of the session cookie */
  authUser:  (cookieHash: string) => `rco:authuser:${cookieHash}`,
  /** Cached decoded token (with revocation check) — 60 s TTL */
  authCheck: (cookieHash: string) => `rco:authcheck:${cookieHash}`,
  /** Cached entries array keyed by MongoDB session id */
  entries:   (sessionId:  string) => `rco:entries:${sessionId}`,
  /** Cached presence count keyed by MongoDB session id */
  presence:  (sessionId:  string) => `rco:presence:${sessionId}`,
  /**
   * Cached dashboard page payload { sessions, countMap, totalSessions }.
   * Keyed by page number + optional search query.
   * Busted on session create / patch / delete so the list stays fresh.
   */
  dashboardPage: (page: number, query?: string) =>
    query
      ? `rco:dashboard:p${page}:q:${query.toLowerCase()}`
      : `rco:dashboard:p${page}`,
  /** Prefix used to invalidate ALL dashboard page caches at once */
  dashboardPrefix: "rco:dashboard:" as const,
  /**
   * @deprecated — kept for backward compat; use dashboardPage() instead.
   * Old single-key cache. Will be cleaned up by cache bust.
   */
  dashboard: "rco:dashboard" as const,
  /** Cached Firebase user list for admin panel — 60 s TTL */
  adminUsers: "rco:adminusers" as const,
  /** Cached MongoDB allowlist for admin panel — 60 s TTL */
  adminAllowlist: "rco:adminallowlist" as const,
};

