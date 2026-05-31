import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/firebase/server";
import { getCachedEntries } from "@/lib/entries-cache";
import { EntriesView } from "@/components/EntriesView";
import type { Entry } from "@/lib/supabase/types";

interface EntriesSectionProps {
  sessionId: string;
  groupBy: "chart_no" | "station" | "train_no" | "shutdown";
}

export async function EntriesSection({ sessionId, groupBy }: EntriesSectionProps) {
  const user = await getCachedUser();
  if (!user) redirect("/auth/login");

  let entries: Entry[] = [];
  try {
    entries = await getCachedEntries(sessionId);
  } catch {
    throw new Error("Database unavailable — could not load entries");
  }

  return <EntriesView sessionId={sessionId} initialEntries={entries} groupBy={groupBy} />;
}