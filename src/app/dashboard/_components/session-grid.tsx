"use client";

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import { SessionCard } from "./session-card";
import { NewSessionButton } from "./new-session-button";
import type { Session } from "@/lib/supabase/types";

interface SessionGridProps {
  sessions: Session[];
  countMap: Record<string, number>;
  currentUserId: string | undefined;
}

export function SessionGrid({ sessions, countMap, currentUserId }: SessionGridProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return sessions;
    return sessions.filter((s) => {
      if (s.name.toLowerCase().includes(q)) return true;
      const dateStr = new Date(s.started_at)
        .toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
        .toLowerCase();
      return dateStr.includes(q);
    });
  }, [sessions, q]);

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-black tracking-tight">Sessions</h1>
          <p className="text-xs text-neutral-400 mt-0.5 font-mono">
            {q
              ? `${filtered.length} of ${sessions.length} session${sessions.length !== 1 ? "s" : ""}`
              : `${sessions.length} session${sessions.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <NewSessionButton />
      </div>

      {/* Search input */}
      <div className="relative mb-6">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sessions…"
          className="w-full sm:max-w-xs pl-8 pr-8 py-2 text-xs border border-neutral-200
                     bg-white text-black placeholder:text-neutral-400 focus:outline-none
                     focus:border-black transition-colors font-mono"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Grid / empty states */}
      {sessions.length === 0 ? (
        <div className="border border-dashed border-neutral-200 py-20 text-center">
          <p className="text-sm text-neutral-400">No sessions yet.</p>
          <p className="text-xs text-neutral-300 mt-1">
            Create one using &quot;+ New Session&quot; above.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-neutral-200 py-20 text-center">
          <p className="text-sm text-neutral-400">No sessions match &quot;{query}&quot;.</p>
          <button
            onClick={() => setQuery("")}
            className="text-xs text-neutral-400 underline underline-offset-2 mt-1 hover:text-black"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              entryCount={countMap[s.id] ?? 0}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}
    </>
  );
}
