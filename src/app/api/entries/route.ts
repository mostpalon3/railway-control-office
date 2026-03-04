import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb/client";
import { adminAuth } from "@/lib/firebase/admin";
import { cookies } from "next/headers";

async function getUid(): Promise<string | null> {
  try {
    const jar = await cookies();
    const session = jar.get("__session")?.value;
    if (!session) return null;
    const decoded = await adminAuth.verifySessionCookie(session, false);
    return decoded.uid;
  } catch {
    return null;
  }
}

/** GET /api/entries?session_id=xxx  — list entries for a session (for polling) */
export async function GET(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });

  const db = await getDb();
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
    created_by: d.created_by ?? null,
    created_at: (d.created_at as Date).toISOString(),
  }));

  return NextResponse.json(entries);
}

/** POST /api/entries  — create a new entry */
export async function POST(req: NextRequest) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { session_id, loco1, loco2, train_no, station, chart_no, sno, date } = body;

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
    created_by: uid,
    created_at: now,
  });

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
      created_by: uid,
      created_at: now.toISOString(),
    },
    { status: 201 }
  );
}
