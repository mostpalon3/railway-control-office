import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb/client";
import { getCachedUser } from "@/lib/firebase/server";
import { getRedis, KEYS } from "@/lib/redis";
import { memDel, memDelPrefix } from "@/lib/mem-cache";

async function invalidateDashboardCache() {
  // L1: wipe all paginated pages from memory
  memDelPrefix(KEYS.dashboardPrefix);
  memDel(KEYS.dashboard); // legacy key

  // L2: wipe all paginated pages from Redis
  const redis = getRedis();
  if (!redis) return;
  try {
    // Scan for all dashboard keys and delete them
    const keys: string[] = [];
    let cursor = 0;
    do {
      const [nextCursor, batch] = await redis.scan(cursor, {
        match: `${KEYS.dashboardPrefix}*`,
        count: 100,
      });
      cursor = typeof nextCursor === "string" ? parseInt(nextCursor, 10) : nextCursor;
      keys.push(...batch);
    } while (cursor !== 0);

    if (keys.length > 0) {
      await Promise.all(keys.map((k) => redis.del(k)));
    }
    // Also delete legacy key
    await redis.del(KEYS.dashboard);
  } catch {
    // Redis is an L2 cache. Ignore invalidation failures and continue.
  }
}

/** POST /api/sessions  — create a new session */
export async function POST(req: NextRequest) {
  const user = await getCachedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const db = await getDb();

  try {
    const result = await db.collection("sessions").insertOne({
      _id:        new ObjectId(),
      name:       name.trim(),
      started_at: new Date(),
      ended_at:   null,
      created_by: user.email,
    });
    // Bust dashboard cache before returning so next refresh sees fresh data.
    await invalidateDashboardCache();
    return NextResponse.json({ id: result.insertedId.toHexString() }, { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "A session with that name already exists" }, { status: 409 });
    }
    throw err;
  }
}
