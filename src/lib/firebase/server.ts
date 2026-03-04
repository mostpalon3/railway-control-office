import { createHash } from "crypto";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { getRedis, KEYS } from "@/lib/redis";
import { memGet, memSet } from "@/lib/mem-cache";

const AUTH_TTL = 300; // cache uid for 5 minutes

/**
 * Reads the __session httpOnly cookie and verifies it with Firebase Admin.
 * Returns the decoded token (with uid, email, etc.) or null.
 * Used by server components (navigation, layout).
 */
export async function getServerUser() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("__session")?.value;
    if (!session) return null;
    const decoded = await adminAuth.verifySessionCookie(session, false);
    return decoded; // { uid, email, ... }
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
