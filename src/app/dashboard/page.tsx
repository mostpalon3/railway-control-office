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

const PAGE_SIZE = 12;

interface PageCache {
  sessions: Session[];
  countMap: Record<string, number>;
  totalSessions: number;
}
const DASHBOARD_TTL_MS = 30_000; // 30 s mem
const DASHBOARD_TTL_S  = 30;     // 30 s Redis

interface DashboardPageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await getCachedUser();
  if (!user) redirect("/auth/login");

  const isAdmin = isAdminEmail(user.email);

  const sp    = await searchParams;
  const page  = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const query = (sp.q ?? "").trim();

  let sessions: Session[] = [];
  let countMap: Record<string, number> = {};
  let totalSessions = 0;

  try {
    // Build a cache key unique to this page + search combo
    const cacheKey = query
      ? KEYS.dashboardPage(page, query)
      : KEYS.dashboardPage(page);

    // L1: in-memory
    const mem = memGet<PageCache>(cacheKey);
    if (mem) {
      sessions      = mem.sessions;
      countMap      = mem.countMap;
      totalSessions = mem.totalSessions;
    } else {
      // L2: Redis
      const redis = getRedis();
      const redisCached = redis ? await redis.get<PageCache>(cacheKey) : null;

      if (redisCached) {
        sessions      = redisCached.sessions;
        countMap      = redisCached.countMap;
        totalSessions = redisCached.totalSessions;
        memSet(cacheKey, redisCached, DASHBOARD_TTL_MS);
      } else {
        // L3: MongoDB — only fetch what we need
        const db = await getDb();

        // Build filter for search
        const filter = query
          ? { name: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } }
          : {};

        // Get total count (for pagination controls)
        totalSessions = await db.collection("sessions").countDocuments(filter);

        // Fetch only this page's sessions using skip + limit
        const docs = await db
          .collection("sessions")
          .find(filter, {
            projection: {
              name: 1,
              started_at: 1,
              ended_at: 1,
              created_by: 1,
            },
          })
          .sort({ started_at: -1 })
          .skip((page - 1) * PAGE_SIZE)
          .limit(PAGE_SIZE)
          .toArray();

        sessions = docs.map((d) => ({
          id:         (d._id as ObjectId).toHexString(),
          name:       d.name as string,
          started_at: (d.started_at as Date).toISOString(),
          ended_at:   d.ended_at ? (d.ended_at as Date).toISOString() : null,
          created_by: (d.created_by as string | null) ?? null,
        }));

        // Fetch entry counts ONLY for the 12 sessions on this page
        const sessionIds = sessions.map((s) => s.id);
        if (sessionIds.length > 0) {
          const countResults = await db
            .collection("entries")
            .aggregate<{ _id: string; count: number }>([
              { $match: { session_id: { $in: sessionIds } } },
              { $group: { _id: "$session_id", count: { $sum: 1 } } },
            ])
            .toArray();
          countMap = Object.fromEntries(countResults.map((r) => [r._id, r.count]));
        }

        // Cache this page
        const payload: PageCache = { sessions, countMap, totalSessions };
        memSet(cacheKey, payload, DASHBOARD_TTL_MS);
        redis?.set(cacheKey, payload, { ex: DASHBOARD_TTL_S }).catch(() => {});
      }
    }
  } catch {
    throw new Error("Database unavailable — could not load sessions");
  }

  const totalPages = Math.max(1, Math.ceil(totalSessions / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-white">
      <Navbar email={user.email} isAdmin={isAdmin} />

      <main className="max-w-7xl mx-auto px-6 py-10">
        <SessionGrid
          sessions={sessions}
          countMap={countMap}
          currentUserId={user.email ?? user.uid}
          currentPage={page}
          totalPages={totalPages}
          totalSessions={totalSessions}
          query={query}
        />
      </main>
    </div>
  );
}
