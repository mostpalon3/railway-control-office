"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { SessionCard } from "./session-card";
import { NewSessionButton } from "./new-session-button";
import type { Session } from "@/lib/supabase/types";

interface SessionGridProps {
  sessions: Session[];
  countMap: Record<string, number>;
  currentUserId: string | undefined;
  currentPage: number;
  totalPages: number;
  totalSessions: number;
  query: string;
}

/**
 * Build a Google-style page-number list with ellipsis.
 * E.g. for page 6 of 20: [1, "…", 4, 5, 6, 7, 8, "…", 20]
 */
function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [];

  // Always show first page
  pages.push(1);

  // Left ellipsis
  if (current > 4) pages.push("…");

  // Window around current
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  // Right ellipsis
  if (current < total - 3) pages.push("…");

  // Always show last page
  if (total > 1) pages.push(total);

  return pages;
}

export function SessionGrid({
  sessions,
  countMap,
  currentUserId,
  currentPage,
  totalPages,
  totalSessions,
  query: serverQuery,
}: SessionGridProps) {
  const router = useRouter();
  const [localQuery, setLocalQuery] = useState(serverQuery);

  const PAGE_SIZE = 12;
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  /** Navigate to a page (preserves search query) */
  function goToPage(page: number) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    if (serverQuery) params.set("q", serverQuery);
    const qs = params.toString();
    router.push(`/dashboard${qs ? `?${qs}` : ""}`);
  }

  /** Submit search — resets to page 1 */
  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = localQuery.trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const qs = params.toString();
    router.push(`/dashboard${qs ? `?${qs}` : ""}`);
  }

  /** Clear search */
  function clearSearch() {
    setLocalQuery("");
    router.push("/dashboard");
  }

  return (
    <>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-black tracking-tight">Sessions</h1>
          <p className="text-xs text-neutral-400 mt-0.5 font-mono">
            {serverQuery
              ? `${totalSessions} result${totalSessions !== 1 ? "s" : ""} for "${serverQuery}"`
              : `${totalSessions} session${totalSessions !== 1 ? "s" : ""}`}
            {totalPages > 1 && (
              <span className="text-neutral-300">
                {" "}· page {currentPage} of {totalPages}
              </span>
            )}
          </p>
        </div>
        <NewSessionButton />
      </div>

      {/* Search input — submits as a form to trigger server-side search */}
      <form onSubmit={handleSearch} className="relative mb-6">
        <Search
          size={13}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
        />
        <input
          type="search"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Search sessions…"
          className="w-full sm:max-w-xs pl-8 pr-8 py-2 text-xs border border-neutral-200
                     bg-white text-black placeholder:text-neutral-400 focus:outline-none
                     focus:border-black transition-colors font-mono"
        />
        {localQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </form>

      {/* Grid / empty states */}
      {totalSessions === 0 && !serverQuery ? (
        <div className="border border-dashed border-neutral-200 py-20 text-center">
          <p className="text-sm text-neutral-400">No sessions yet.</p>
          <p className="text-xs text-neutral-300 mt-1">
            Create one using &quot;+ New Session&quot; above.
          </p>
        </div>
      ) : totalSessions === 0 && serverQuery ? (
        <div className="border border-dashed border-neutral-200 py-20 text-center">
          <p className="text-sm text-neutral-400">No sessions match &quot;{serverQuery}&quot;.</p>
          <button
            onClick={clearSearch}
            className="text-xs text-neutral-400 underline underline-offset-2 mt-1 hover:text-black"
          >
            Clear search
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sessions.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                entryCount={countMap[s.id] ?? 0}
                currentUserId={currentUserId}
              />
            ))}
          </div>

          {/* ── Pagination bar (Google-style) ───────────── */}
          {totalPages > 1 && (
            <nav
              aria-label="Session pages"
              className="flex items-center justify-center gap-1 mt-10 select-none"
            >
              {/* Previous button */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
                className="h-8 w-8 flex items-center justify-center border border-neutral-200
                           text-neutral-400 hover:border-black hover:text-black
                           transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                           disabled:hover:border-neutral-200 disabled:hover:text-neutral-400"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page numbers */}
              {pageNumbers.map((p, i) =>
                p === "…" ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="h-8 w-8 flex items-center justify-center
                               font-mono text-xs text-neutral-300"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    aria-label={`Page ${p}`}
                    aria-current={p === currentPage ? "page" : undefined}
                    className={`h-8 w-8 flex items-center justify-center font-mono text-xs
                                border transition-colors
                                ${
                                  p === currentPage
                                    ? "bg-black text-white border-black"
                                    : "border-neutral-200 text-neutral-500 hover:border-black hover:text-black"
                                }`}
                  >
                    {p}
                  </button>
                )
              )}

              {/* Next button */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
                className="h-8 w-8 flex items-center justify-center border border-neutral-200
                           text-neutral-400 hover:border-black hover:text-black
                           transition-colors disabled:opacity-30 disabled:cursor-not-allowed
                           disabled:hover:border-neutral-200 disabled:hover:text-neutral-400"
              >
                <ChevronRight size={14} />
              </button>
            </nav>
          )}

          {/* Page range summary */}
          {totalPages > 1 && (
            <p className="text-center font-mono text-[10px] text-neutral-300 mt-3">
              Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, totalSessions)} of {totalSessions}
            </p>
          )}
        </>
      )}
    </>
  );
}
