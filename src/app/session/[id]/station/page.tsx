import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/firebase/server";
import { getDb } from "@/lib/mongodb/client";
import { ObjectId } from "mongodb";
import { EntriesView } from "@/components/EntriesView";
import type { Entry } from "@/lib/supabase/types";

interface StationPageProps {
  params: Promise<{ id: string }>;
}

export default async function StationPage({ params }: StationPageProps) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) redirect("/auth/login");

  let entries: Entry[] = [];
  try {
    const db = await getDb();
    const docs = await db
      .collection("entries")
      .find({ session_id: id })
      .sort({ created_at: -1 })
      .toArray();

    entries = docs.map((d) => ({
      id:         (d._id as ObjectId).toHexString(),
      session_id: d.session_id as string,
      loco1:      d.loco1 as string,
      loco2:      (d.loco2 as string | null) ?? null,
      train_no:   d.train_no as string,
      station:    d.station as string,
      chart_no:   d.chart_no,
      sno:        d.sno,
      date:       d.date as string,
      created_by: (d.created_by as string | null) ?? null,
      created_at: (d.created_at as Date).toISOString(),
    }));
  } catch {
    throw new Error("Database unavailable — could not load entries");
  }

  return (
    <EntriesView
      sessionId={id}
      initialEntries={entries}
      groupBy="station"
    />
  );
}
