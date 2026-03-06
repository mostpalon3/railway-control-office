/**
 * Shared entries cache helper.
 *
 * Used by both the /api/entries GET route (for real-time polling) and the
 * session server pages (train / station / chart / shutdown) so they all share
 * the same L1 + L2 cache instead of hitting MongoDB independently.
 *
 * Cache layers:
 *   L1 — in-memory Map (0 ms, same Lambda instance only)
 *   L2 — Redis        (~20 ms, shared across all Lambda instances / cold starts)
 *   L3 — MongoDB      (source of truth, ~200–400 ms on Atlas free tier)
 */

import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb/client";
import { getRedis, KEYS } from "@/lib/redis";
import { memGet, memSet, memDel } from "@/lib/mem-cache";
import type { Entry } from "@/lib/supabase/types";

// 30 s — 3× longer than the poll interval so server page renders always hit
// L1 cache between polls. New entries bust the cache immediately via POST.
const ENTRIES_MEM_TTL_MS = 30_000;
const ENTRIES_REDIS_TTL  = 60;    // 60 s — seconds (for Upstash `ex` option)

/** Return cached entries for a session, populating all cache layers on miss. */
export async function getCachedEntries(sessionId: string): Promise<Entry[]> {
  const key = KEYS.entries(sessionId);

  // L1: in-memory (~0 ms)
  const mem = memGet<Entry[]>(key);
  if (mem) return mem;

  // L2: Redis (~20 ms on a warm connection — faster than a cold MongoDB round-trip)
  const redis = getRedis();
  if (redis) {
    const cached = await redis.get<Entry[]>(key);
    if (cached) {
      memSet(key, cached, ENTRIES_MEM_TTL_MS);
      return cached;
    }
  }

  // L3: MongoDB (source of truth)
  const db   = await getDb();
  const docs = await db
    .collection("entries")
    .find({ session_id: sessionId })
    .sort({ created_at: -1 })
    .toArray();

  const entries: Entry[] = docs.map((d) => ({
    id:         (d._id as ObjectId).toHexString(),
    session_id: d.session_id as string,
    loco1:      d.loco1 as string,
    loco2:      (d.loco2 as string | null) ?? null,
    train_no:   d.train_no as string,
    station:    d.station as string,
    chart_no:   d.chart_no,
    sno:        d.sno,
    date:       d.date as string,
    shutdown:   d.shutdown === true,
    shed1:      (d.shed1 as string | null) ?? null,
    shed2:      (d.shed2 as string | null) ?? null,
    created_by: (d.created_by as string | null) ?? null,
    created_at: (d.created_at as Date).toISOString(),
  }));

  // Populate both cache layers
  memSet(key, entries, ENTRIES_MEM_TTL_MS);
  redis?.set(key, entries, { ex: ENTRIES_REDIS_TTL }).catch(() => {});

  return entries;
}

/** Evict L1 + L2 entries cache for a session.  Call after any mutation. */
export function bustEntriesCache(sessionId: string): void {
  const key = KEYS.entries(sessionId);
  memDel(key);
  getRedis()?.del(key).catch(() => {});
}
