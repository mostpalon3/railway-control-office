import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/firebase/server";
import { getCachedEntries } from "@/lib/entries-cache";
import { EntriesView } from "@/components/EntriesView";
import type { Entry } from "@/lib/supabase/types";

interface StationPageProps {
  params: Promise<{ id: string }>;
}

export default async function StationPage({ params }: StationPageProps) {
  const { id } = await params;
  const user = await getCachedUser();
  if (!user) redirect("/auth/login");

  let entries: Entry[] = [];
  try {
    entries = await getCachedEntries(id);
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
