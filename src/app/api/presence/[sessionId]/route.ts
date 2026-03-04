import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb/client";
import { getCachedUid } from "@/lib/firebase/server";

const STALE_MS = 35_000; // 35 s — prune entries older than this


/** GET /api/presence/[sessionId]  — return count of active users */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const db = await getDb();
  const cutoff = new Date(Date.now() - STALE_MS);
  const count = await db
    .collection("presence")
    .countDocuments({ session_id: sessionId, last_seen: { $gte: cutoff } });

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

  return NextResponse.json({ ok: true });
}
