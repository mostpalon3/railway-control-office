import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb/client";
import { getCachedUid } from "@/lib/firebase/server";

/** POST /api/sessions  — create a new session */
export async function POST(req: NextRequest) {
  const uid = await getCachedUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const db = await getDb();
  const result = await db.collection("sessions").insertOne({
    _id:        new ObjectId(),
    name:       name.trim(),
    started_at: new Date(),
    ended_at:   null,
    created_by: uid,
  });

  return NextResponse.json({ id: result.insertedId.toHexString() }, { status: 201 });
}
