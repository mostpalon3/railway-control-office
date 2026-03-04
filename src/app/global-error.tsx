"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-500">
              Critical Error
            </p>
            <h1 className="text-2xl font-semibold text-black tracking-tight">
              Something went wrong
            </h1>
            <p className="text-sm text-neutral-500 font-mono">
              The application encountered an unexpected error and could not recover.
            </p>
          </div>

          {error.digest && (
            <p className="text-[10px] font-mono text-neutral-300 border border-neutral-100 px-3 py-2">
              Error ID: {error.digest}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={reset}
              className="w-full sm:w-auto px-6 h-9 border border-black bg-black text-white
                         text-[11px] font-mono uppercase tracking-wider hover:bg-neutral-800
                         transition-colors rounded-none"
            >
              Try again
            </button>
            <a
              href="/"
              className="w-full sm:w-auto px-6 h-9 border border-neutral-300 text-neutral-600
                         text-[11px] font-mono uppercase tracking-wider hover:border-black
                         hover:text-black transition-colors rounded-none flex items-center justify-center"
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
