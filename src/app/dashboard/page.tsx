import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/firebase/server";
import { isAdminEmail } from "@/lib/is-admin";
import { getDb } from "@/lib/mongodb/client";
import { ObjectId } from "mongodb";
import { getRedis, KEYS } from "@/lib/redis";
import { memGet, memSet } from "@/lib/mem-cache";
import { Navbar } from "./_components/navbar";
import { SessionCard } from "./_components/session-card";
import { NewSessionButton } from "./_components/new-session-button";
import type { Session } from "@/lib/supabase/types";

interface DashboardCache {
  sessions: Session[];
  countMap: Record<string, number>;
}
const DASHBOARD_TTL_MS = 30_000; // 30 s mem
const DASHBOARD_TTL_S  = 30;     // 30 s Redis

export default async function DashboardPage() {
  const user = await getServerUser();
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
          .find({})
          .sort({ started_at: -1 })
          .toArray();

        sessions = docs.map((d) => ({
          id:         (d._id as ObjectId).toHexString(),
          name:       d.name as string,
          started_at: (d.started_at as Date).toISOString(),
          ended_at:   d.ended_at ? (d.ended_at as Date).toISOString() : null,
          created_by: (d.created_by as string | null) ?? null,
        }));

        const countResults = await Promise.all(
          sessions.map((s) =>
            db
              .collection("entries")
              .countDocuments({ session_id: s.id })
              .then((count) => ({ id: s.id, count }))
          )
        );
        countMap = Object.fromEntries(countResults.map((r) => [r.id, r.count]));

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
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-lg font-semibold text-black tracking-tight">Sessions</h1>
            <p className="text-xs text-neutral-400 mt-0.5 font-mono">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""}
            </p>
          </div>
          <NewSessionButton />
        </div>

        {/* Grid */}
        {sessions.length === 0 ? (
          <div className="border border-dashed border-neutral-200 py-20 text-center">
            <p className="text-sm text-neutral-400">No sessions yet.</p>
            <p className="text-xs text-neutral-300 mt-1">
              Create one using &quot;+ New Session&quot; above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                entryCount={countMap[s.id] ?? 0}
                currentUserId={user.email ?? user.uid}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
