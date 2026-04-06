import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/firebase/server";
import { isAdminEmail } from "@/lib/is-admin";
import { getDb } from "@/lib/mongodb/client";
import { ObjectId } from "mongodb";
import { getRedis, KEYS } from "@/lib/redis";
import { memGet, memSet } from "@/lib/mem-cache";
import { Navbar } from "./_components/navbar";
import { SessionGrid } from "./_components/session-grid";
import type { Session } from "@/lib/supabase/types";

interface DashboardCache {
  sessions: Session[];
  countMap: Record<string, number>;
}
const DASHBOARD_TTL_MS = 30_000; // 30 s mem
const DASHBOARD_TTL_S  = 30;     // 30 s Redis

export default async function DashboardPage() {
  const user = await getCachedUser();
  if (!user) redirect("/auth/login");

  const isAdmin = isAdminEmail(user.email);

  let sessions: Session[] = [];
  let countMap: Record<string, number> = {};

  try {
    const cacheKey = KEYS.dashboard;

    // L1: in-memory
    const mem = memGet<DashboardCache>(cacheKey);
    if (mem) {
      sessions = mem.sessions;
      countMap = mem.countMap;
    } else {
      // L2: Redis
      const redis = getRedis();
      const redisCached = redis ? await redis.get<DashboardCache>(cacheKey) : null;

      if (redisCached) {
        sessions = redisCached.sessions;
        countMap = redisCached.countMap;
        memSet(cacheKey, redisCached, DASHBOARD_TTL_MS);
      } else {
        // L3: MongoDB
        const db = await getDb();

        const docs = await db
          .collection("sessions")
          .find(
            {},
            {
              projection: {
                name: 1,
                started_at: 1,
                ended_at: 1,
                created_by: 1,
              },
            }
          )
          .sort({ started_at: -1 })
          .toArray();

        sessions = docs.map((d) => ({
          id:         (d._id as ObjectId).toHexString(),
          name:       d.name as string,
          started_at: (d.started_at as Date).toISOString(),
          ended_at:   d.ended_at ? (d.ended_at as Date).toISOString() : null,
          created_by: (d.created_by as string | null) ?? null,
        }));

        const countResults = await db
          .collection("entries")
          .aggregate<{ _id: string; count: number }>([
            { $group: { _id: "$session_id", count: { $sum: 1 } } },
          ])
          .toArray();
        countMap = Object.fromEntries(countResults.map((r) => [r._id, r.count]));

        const payload: DashboardCache = { sessions, countMap };
        memSet(cacheKey, payload, DASHBOARD_TTL_MS);
        redis?.set(cacheKey, payload, { ex: DASHBOARD_TTL_S }).catch(() => {});
      }
    }
  } catch {
    throw new Error("Database unavailable — could not load sessions");
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar email={user.email} isAdmin={isAdmin} />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <SessionGrid
          sessions={sessions}
          countMap={countMap}
          currentUserId={user.email ?? user.uid}
        />
      </main>
    </div>
  );
}
