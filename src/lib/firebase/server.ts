import { createHash } from "crypto";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { getRedis, KEYS } from "@/lib/redis";
import { memGet, memSet } from "@/lib/mem-cache";

const AUTH_TTL = 300;       // cache uid for 5 minutes
const AUTH_CHECK_TTL = 60;  // cache revocation check for 60 seconds

/**
 * Reads the __session httpOnly cookie and verifies it with Firebase Admin.
 * Result is cached for 60 seconds (mem → Redis) so only one Firebase network
 * call is made per user per minute instead of on every page load.
 * If the account is revoked/disabled the cache is bypassed and null returned.
 */
export async function getServerUser() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("__session")?.value;
    if (!session) return null;

    const hash     = createHash("sha256").update(session).digest("hex");
    const cacheKey = KEYS.authCheck(hash);

    // L1: in-memory — 0 ms
    const mem = memGet<ReturnType<typeof adminAuth.verifySessionCookie> extends Promise<infer T> ? T : never>(cacheKey);
    if (mem) return mem;

    // L2: Redis
    const redis = getRedis();
    if (redis) {
      const cached = await redis
        .get<ReturnType<typeof adminAuth.verifySessionCookie> extends Promise<infer T> ? T : never>(cacheKey)
        .catch(() => null);
      if (cached) {
        memSet(cacheKey, cached, AUTH_CHECK_TTL * 1000);
        return cached;
      }
    }

    // L3: Firebase Admin — with revocation check
    let decoded: Awaited<ReturnType<typeof adminAuth.verifySessionCookie>>;
    try {
      decoded = await adminAuth.verifySessionCookie(session, true);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (
        code === "auth/session-cookie-revoked" ||
        code === "auth/user-disabled" ||
        code === "auth/user-token-expired"
      ) {
        return null;
      }
      // Transient Firebase network error — fall back to local-only verify
      decoded = await adminAuth.verifySessionCookie(session, false);
    }

    memSet(cacheKey, decoded, AUTH_CHECK_TTL * 1000);
    redis?.set(cacheKey, decoded, { ex: AUTH_CHECK_TTL }).catch(() => {});
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Returns { uid, email } for the logged-in user, cached in memory + Redis.
 * Use this when you need the email (e.g. storing created_by).
 */
export async function getCachedUser(): Promise<{ uid: string; email: string } | null> {
  try {
    const jar     = await cookies();
    const session = jar.get("__session")?.value;
    if (!session) return null;

    const hash     = createHash("sha256").update(session).digest("hex");
    const cacheKey = KEYS.authUser(hash);

    const mem = memGet<{ uid: string; email: string }>(cacheKey);
    if (mem) return mem;

    const redis = getRedis();
    if (redis) {
      const cached = await redis.get<{ uid: string; email: string }>(cacheKey).catch(() => null);
      if (cached) {
        memSet(cacheKey, cached, AUTH_TTL * 1000);
        return cached;
      }
    }

    const decoded = await adminAuth.verifySessionCookie(session, false);
    const user = { uid: decoded.uid, email: decoded.email ?? decoded.uid };
    memSet(cacheKey, user, AUTH_TTL * 1000);
    redis?.set(cacheKey, user, { ex: AUTH_TTL }).catch(() => {});
    return user;
  } catch {
    return null;
  }
}

/** Cached uid lookup — used by all API routes for auth checks. */
export async function getCachedUid(): Promise<string | null> {
  try {
    const jar     = await cookies();
    const session = jar.get("__session")?.value;
    if (!session) return null;

    const hash     = createHash("sha256").update(session).digest("hex");
    const cacheKey = KEYS.auth(hash);

    // L1: in-memory (0 ms) — covers all requests within this Lambda instance
    const mem = memGet<string>(cacheKey);
    if (mem) return mem;

    // L2: Redis (network, but only on cold Lambda start — skip if slow)
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get<string>(cacheKey).catch(() => null);
      if (cached) {
        memSet(cacheKey, cached, AUTH_TTL * 1000);
        return cached;
      }
    }

    // L3: Firebase Admin verify (fast after key cache is warm)
    const decoded = await adminAuth.verifySessionCookie(session, false);
    memSet(cacheKey, decoded.uid, AUTH_TTL * 1000);
    redis?.set(cacheKey, decoded.uid, { ex: AUTH_TTL }).catch(() => {});
    return decoded.uid;
  } catch {
    return null;
  }
}
