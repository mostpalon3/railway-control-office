import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb/client";
import { getCachedUser } from "@/lib/firebase/server";

/** POST /api/sessions  — create a new session */
export async function POST(req: NextRequest) {
  const user = await getCachedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

  const db = await getDb();

  // Application-level uniqueness check (works even before the DB index is active)
  const existing = await db.collection("sessions").findOne(
    { name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
    { projection: { _id: 1 } }
  );
  if (existing) {
    return NextResponse.json({ error: "A session with that name already exists" }, { status: 409 });
  }

  try {
    const result = await db.collection("sessions").insertOne({
      _id:        new ObjectId(),
      name:       name.trim(),
      started_at: new Date(),
      ended_at:   null,
      created_by: user.email,
    });
    return NextResponse.json({ id: result.insertedId.toHexString() }, { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "A session with that name already exists" }, { status: 409 });
    }
    throw err;
  }
}
