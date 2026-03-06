import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb/client";
import { getCachedUid } from "@/lib/firebase/server";
import { bustEntriesCache } from "@/lib/entries-cache";

/** PATCH /api/entries/[id]  — update an entry */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await getCachedUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const db = await getDb();
  // Fetch the entry first so we can bust the right session's cache after update
  const existing = await db.collection("entries").findOne(
    { _id: new ObjectId(id) },
    { projection: { session_id: 1 } }
  );
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
        ...(body.shutdown !== undefined && { shutdown: body.shutdown === true }),
        ...(body.shed     !== undefined && { shed:     body.shed?.trim().toUpperCase() || null }),
      },
    }
  );
  // Bust entries cache so the updated content is served on next fetch
  if (existing?.session_id) bustEntriesCache(existing.session_id as string);

  return NextResponse.json({ ok: true });
}

/** DELETE /api/entries/[id]  — delete an entry */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const uid = await getCachedUid();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = await getDb();
  // Look up the entry's session_id before deletion so we can bust the right cache
  const existing = await db.collection("entries").findOne(
    { _id: new ObjectId(id) },
    { projection: { session_id: 1 } }
  );
  await db.collection("entries").deleteOne({ _id: new ObjectId(id) });
  if (existing?.session_id) bustEntriesCache(existing.session_id as string);

  return NextResponse.json({ ok: true });
}
