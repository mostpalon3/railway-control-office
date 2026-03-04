"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-8">

        {/* Icon + heading */}
        <div className="space-y-3">
          <AlertTriangle size={28} className="text-red-500" />
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-500">
              Page Error
            </p>
            <h1 className="text-xl font-semibold text-black tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm text-neutral-500">
              An error occurred while loading this page. Your data is safe.
            </p>
          </div>
        </div>

        {/* Error detail */}
        {(error.message || error.digest) && (
          <div className="border border-neutral-100 bg-neutral-50 px-4 py-3 space-y-1">
            {error.message && (
              <p className="text-[11px] font-mono text-neutral-600 break-all">
                {error.message}
              </p>
            )}
            {error.digest && (
              <p className="text-[10px] font-mono text-neutral-300">
                ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 px-5 h-9 border border-black
                       bg-black text-white text-[11px] font-mono uppercase tracking-wider
                       hover:bg-neutral-800 transition-colors rounded-none"
          >
            <RefreshCw size={12} />
            Try again
          </button>
          <a
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-5 h-9 border border-neutral-300
                       text-neutral-600 text-[11px] font-mono uppercase tracking-wider
                       hover:border-black hover:text-black transition-colors rounded-none"
          >
            <LayoutDashboard size={12} />
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
