import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb/client";
import { getCachedUid } from "@/lib/firebase/server";
import { getRedis, KEYS } from "@/lib/redis";
import { memDel, memGet, memSet } from "@/lib/mem-cache";

const STALE_MS = 35_000; // 35 s — prune entries older than this
const PRESENCE_COUNT_TTL_MS = 10_000; // 10 s — presence doesn't need to be real-time


/** GET /api/presence/[sessionId]  — return count of active users */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;

  const cacheKey = KEYS.presence(sessionId);
  const cached = memGet<number>(cacheKey);
  if (cached !== null) {
    return NextResponse.json({ count: cached });
  }

  const redis = getRedis();
  if (redis) {
    const redisCached = await redis.get<number>(cacheKey).catch(() => null);
    if (redisCached !== null && redisCached !== undefined) {
      memSet(cacheKey, redisCached, PRESENCE_COUNT_TTL_MS);
      return NextResponse.json({ count: redisCached });
    }
  }

  const db = await getDb();
  const cutoff = new Date(Date.now() - STALE_MS);
  const count = await db
    .collection("presence")
    .countDocuments({ session_id: sessionId, last_seen: { $gte: cutoff } });

  memSet(cacheKey, count, PRESENCE_COUNT_TTL_MS);
  redis?.set(cacheKey, count, { ex: 10 }).catch(() => {});

  return NextResponse.json({ count });
}

/** POST /api/presence/[sessionId]  — heartbeat (upsert user) */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const uid = await getCachedUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId } = await params;
  const db = await getDb();
  await db.collection("presence").updateOne(
    { session_id: sessionId, uid },
    { $set: { session_id: sessionId, uid, last_seen: new Date() }, $setOnInsert: { _id: new ObjectId() } },
    { upsert: true }
  );

  const cacheKey = KEYS.presence(sessionId);
  memDel(cacheKey);
  await getRedis()?.del(cacheKey).catch(() => {});

  return NextResponse.json({ ok: true });
}
