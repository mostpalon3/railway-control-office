import { getDb } from "@/lib/mongodb/client";
import { ObjectId } from "mongodb";
import { notFound, redirect } from "next/navigation";
import { getCachedUser } from "@/lib/firebase/server";
import { TabNav } from "./_components/tab-nav";
import { SessionActions } from "./_components/session-actions";
import { SessionStatus } from "./_components/session-status";
import type { Session } from "@/lib/supabase/types";
import { Suspense } from "react";

interface SessionLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function SessionLayout({
  children,
  params,
}: SessionLayoutProps) {
  const { id } = await params;

  // Auth guard — redirect to login if not signed in
  const user = await getCachedUser();
  if (!user) redirect("/auth/login");

  // Validate ObjectId format before hitting DB — prevents a 500 on garbage URLs
  if (!ObjectId.isValid(id)) notFound();

  let session: Pick<Session, "id" | "name" | "ended_at"> | null = null;
  try {
    const db = await getDb();
    const docSnap = await db.collection("sessions").findOne({ _id: new ObjectId(id) });
    if (!docSnap) notFound();
    session = {
      id,
      name:     docSnap.name as string,
      ended_at: docSnap.ended_at ? (docSnap.ended_at as Date).toISOString() : null,
    };
  } catch (err) {
    // notFound() uses a special digest — let it propagate normally
    if ((err as { digest?: string })?.digest?.startsWith("NEXT_NOT_FOUND")) throw err;
    // On any DB error, send user back to dashboard rather than showing error screen
    redirect("/dashboard");
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
            <span className="hidden sm:inline text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5
                             border border-neutral-300 text-neutral-500 font-medium">
              Closed
            </span>
          ) : (
            <span className="hidden sm:inline text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5
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
      <Suspense fallback={
        <div className="border-b border-neutral-200 px-6">
          <div className="flex gap-0 pt-0.5">
            {[80, 72, 64, 60].map((w, i) => (
              <div key={i} className="px-5 py-3">
                <div className="h-2.5 bg-neutral-100 animate-pulse" style={{ width: w }} />
              </div>
            ))}
          </div>
          <div className="pb-3">
            <div className="h-8 w-full bg-neutral-50 border border-neutral-200" />
          </div>
        </div>
      }>
        <TabNav sessionId={id} />
      </Suspense>

      {/* Page content */}
      <main className="px-2 sm:px-6 py-6">{children}</main>
    </div>
  );
}

