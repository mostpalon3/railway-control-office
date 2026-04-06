import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb/client";
import { getCachedUid } from "@/lib/firebase/server";
import { getRedis, KEYS } from "@/lib/redis";
import { memDel } from "@/lib/mem-cache";

async function delRedisKey(key: string) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch {
    // Redis is optional cache; ignore invalidation failures.
  }
}

async function invalidateDashboardCache() {
  memDel(KEYS.dashboard);
  await delRedisKey(KEYS.dashboard);
}

/** PATCH /api/sessions/[id]  — update ended_at (open/close) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await getCachedUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const db = await getDb();
  await db.collection("sessions").updateOne(
    { _id: new ObjectId(id) },
    { $set: { ended_at: body.ended_at ? new Date(body.ended_at) : null } }
  );

  // Bust dashboard cache before returning so open/close reflects immediately.
  await invalidateDashboardCache();

  return NextResponse.json({ ok: true });
}

/** DELETE /api/sessions/[id]  — delete session + all its entries */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await getCachedUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();

  await db.collection("entries").deleteMany({ session_id: id });
  await db.collection("sessions").deleteOne({ _id: new ObjectId(id) });
  // Bust L1 + L2 cache for the deleted session's entries.
  memDel(KEYS.entries(id));
  await delRedisKey(KEYS.entries(id));
  // Bust dashboard cache before returning so deleted session disappears instantly.
  await invalidateDashboardCache();

  return NextResponse.json({ ok: true });
}
