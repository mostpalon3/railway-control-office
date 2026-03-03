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
    const decoded = await adminAuth.verifySessionCookie(session, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

/** PATCH /api/sessions/[id]  — update ended_at (open/close) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const db = await getDb();
  await db.collection("sessions").updateOne(
    { _id: new ObjectId(id) },
    { $set: { ended_at: body.ended_at ? new Date(body.ended_at) : null } }
  );

  return NextResponse.json({ ok: true });
}

/** DELETE /api/sessions/[id]  — delete session + all its entries */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();

  await db.collection("entries").deleteMany({ session_id: id });
  await db.collection("sessions").deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ ok: true });
}
