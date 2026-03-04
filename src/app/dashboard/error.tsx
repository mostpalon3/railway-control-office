"use client";

import { useEffect } from "react";
import { Database, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  const isDbError =
    error.message?.toLowerCase().includes("mongo") ||
    error.message?.toLowerCase().includes("connect");

  return (
    <div className="py-20 flex flex-col items-center gap-6 text-center px-6">
      <Database size={24} className={isDbError ? "text-red-400" : "text-neutral-300"} />

      <div className="space-y-1 max-w-xs">
        <h2 className="text-base font-semibold text-black tracking-tight">
          {isDbError ? "Database unavailable" : "Could not load dashboard"}
        </h2>
        <p className="text-sm text-neutral-500">
          {isDbError
            ? "Could not connect to the database. Check your connection and try again."
            : "An error occurred while loading your sessions."}
        </p>
      </div>

      {error.message && (
        <p className="text-[10px] font-mono text-neutral-300 max-w-xs break-all">
          {error.message}
        </p>
      )}

      <button
        onClick={reset}
        className="flex items-center gap-2 px-5 h-9 border border-black bg-black text-white
                   text-[11px] font-mono uppercase tracking-wider hover:bg-neutral-800
                   transition-colors rounded-none"
      >
        <RefreshCw size={12} />
        Try again
      </button>
    </div>
  );
}
