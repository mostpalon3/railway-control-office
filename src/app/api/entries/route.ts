import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb/client";
import { getCachedUid, getCachedUser } from "@/lib/firebase/server";
import { getRedis, KEYS } from "@/lib/redis";
import { memGet, memSet, memDel } from "@/lib/mem-cache";

const ENTRIES_TTL_MS = 8_000; // 8 s — matches poll interval

/** GET /api/entries?session_id=xxx  — list entries for a session (for polling) */
export async function GET(req: NextRequest) {
  const uid = await getCachedUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });

  const cacheKey = KEYS.entries(sessionId);

  // L1: in-memory (<1 ms) — handles the vast majority of polls
  const mem = memGet<unknown[]>(cacheKey);
  if (mem) return NextResponse.json(mem);

  // L2: MongoDB (50 ms with warm pool — faster than a remote Redis HTTP call)
  const db   = await getDb();
  const docs = await db
    .collection("entries")
    .find({ session_id: sessionId })
    .sort({ created_at: -1 })
    .toArray();

  const entries = docs.map((d) => ({
    id:         (d._id as ObjectId).toHexString(),
    session_id: d.session_id,
    loco1:      d.loco1,
    loco2:      d.loco2 ?? null,
    train_no:   d.train_no,
    station:    d.station,
    chart_no:   d.chart_no,
    sno:        d.sno,
    date:       d.date,
    shutdown:   d.shutdown === true,
    created_by: d.created_by ?? null,
    created_at: (d.created_at as Date).toISOString(),
  }));

  memSet(cacheKey, entries, ENTRIES_TTL_MS);
  return NextResponse.json(entries);
}

/** POST /api/entries  — create a new entry */
export async function POST(req: NextRequest) {
  const user = await getCachedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { session_id, loco1, loco2, train_no, station, chart_no, sno, date, shutdown } = body;

  if (!session_id || !loco1 || !train_no || !station || !chart_no || !sno || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = await getDb();

  // Duplicate loco1 check
  const dup = await db.collection("entries").findOne({ session_id, loco1: loco1.trim() });
  if (dup) {
    return NextResponse.json(
      { error: `Loco ${loco1} is already entered in this session`, code: "DUPLICATE_LOCO" },
      { status: 409 }
    );
  }

  const now = new Date();
  const result = await db.collection("entries").insertOne({
    _id:        new ObjectId(),
    session_id,
    loco1:      loco1.trim(),
    loco2:      loco2?.trim() || null,
    train_no:   train_no.trim(),
    station:    station.trim(),
    chart_no,
    sno:        Number(sno),
    date,
    shutdown:   shutdown === true,
    created_by: user.email,
    created_at: now,
  });

  // Bust L1 + L2 cache so the next poll picks up the new entry
  memDel(KEYS.entries(session_id));
  getRedis()?.del(KEYS.entries(session_id)).catch(() => {});

  return NextResponse.json(
    {
      id:         result.insertedId.toHexString(),
      session_id,
      loco1:      loco1.trim(),
      loco2:      loco2?.trim() || null,
      train_no:   train_no.trim(),
      station:    station.trim(),
      chart_no,
      sno:        Number(sno),
      date,
      shutdown:   shutdown === true,
      created_by: user.email,
      created_at: now.toISOString(),
    },
    { status: 201 }
  );
}
