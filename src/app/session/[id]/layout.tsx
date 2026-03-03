import { getDb } from "@/lib/mongodb/client";
import { ObjectId } from "mongodb";
import { TabNav } from "./_components/tab-nav";
import { SessionActions } from "./_components/session-actions";
import { SessionStatus } from "./_components/session-status";
import type { Session } from "@/lib/supabase/types";

interface SessionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function SessionLayout({
  children,
  params,
}: SessionLayoutProps) {
  const { id } = await params;

  // Fetch session from MongoDB
  const db = await getDb();
  const docSnap = await db.collection("sessions").findOne({ _id: new ObjectId(id) });
  let session: Pick<Session, "id" | "name" | "ended_at"> | null = null;
  if (docSnap) {
    session = {
      id,
      name:     docSnap.name as string,
      ended_at: docSnap.ended_at ? (docSnap.ended_at as Date).toISOString() : null,
    };
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="border-b border-neutral-200 bg-white px-3 sm:px-6 h-12 flex items-center gap-2 sm:gap-3">
        {/* Session identity */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-semibold text-sm text-black truncate max-w-[7rem] sm:max-w-[14rem]">
            {session?.name ?? id}
          </span>
          {session?.ended_at ? (
            <span className="text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5
                             border border-neutral-300 text-neutral-500 font-medium">
              Closed
            </span>
          ) : (
            <span className="text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5
                             border border-emerald-400 text-emerald-600 font-medium">
              Active
            </span>
          )}
          <span className="font-mono text-[9px] text-neutral-400 hidden md:block truncate max-w-[12rem]">
            {id}
          </span>
        </div>

        {/* Realtime presence indicator */}
        <div className="hidden sm:flex items-center border-l border-neutral-200 pl-3 ml-1">
          <SessionStatus sessionId={id} />
        </div>

        {/* Session-level actions (Save / Delete / Dashboard) */}
        <SessionActions
          sessionId={id}
          sessionName={session?.name ?? id}
        />
      </header>

      {/* Tab navigation */}
      <TabNav sessionId={id} />

      {/* Page content */}
      <main className="px-6 py-6">{children}</main>
    </div>
  );
}

