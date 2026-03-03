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

/** PATCH /api/entries/[id]  — update an entry */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const db = await getDb();
  await db.collection("entries").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...(body.loco1    !== undefined && { loco1:    body.loco1.trim()    }),
        ...(body.loco2    !== undefined && { loco2:    body.loco2?.trim() || null }),
        ...(body.train_no !== undefined && { train_no: body.train_no.trim() }),
        ...(body.station  !== undefined && { station:  body.station.trim()  }),
        ...(body.chart_no !== undefined && { chart_no: body.chart_no        }),
        ...(body.sno      !== undefined && { sno:      Number(body.sno)     }),
        ...(body.date     !== undefined && { date:     body.date            }),
      },
    }
  );

  return NextResponse.json({ ok: true });
}

/** DELETE /api/entries/[id]  — delete an entry */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await getUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  await db.collection("entries").deleteOne({ _id: new ObjectId(id) });

  return NextResponse.json({ ok: true });
}
