"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, ArrowLeft, Database, WifiOff } from "lucide-react";

function diagnose(error: Error): { icon: React.ReactNode; title: string; detail: string } {
  const msg = error.message?.toLowerCase() ?? "";

  if (msg.includes("auth") || msg.includes("unauthorized") || msg.includes("session")) {
    return {
      icon: <AlertTriangle size={24} className="text-amber-500" />,
      title: "Authentication error",
      detail: "Your session may have expired. Please sign in again.",
    };
  }
  if (msg.includes("mongo") || msg.includes("database") || msg.includes("connect")) {
    return {
      icon: <Database size={24} className="text-red-400" />,
      title: "Database unavailable",
      detail: "Could not reach the database. Check your connection and try again.",
    };
  }
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed")) {
    return {
      icon: <WifiOff size={24} className="text-neutral-400" />,
      title: "Network error",
      detail: "A network request failed. Check your connection and try again.",
    };
  }
  return {
    icon: <AlertTriangle size={24} className="text-red-500" />,
    title: "Something went wrong",
    detail: "An unexpected error occurred while loading this session.",
  };
}

export default function SessionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { icon, title, detail } = diagnose(error);

  useEffect(() => {
    console.error("[SessionError]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-sm w-full space-y-7">

        {/* Icon + message */}
        <div className="space-y-3">
          {icon}
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
              Session · {params?.id?.slice(0, 8) ?? "—"}
            </p>
            <h2 className="text-lg font-semibold text-black tracking-tight">{title}</h2>
            <p className="text-sm text-neutral-500">{detail}</p>
          </div>
        </div>

        {/* Debug info (hidden from non-devs visually) */}
        {error.message && (
          <div className="border border-neutral-100 bg-neutral-50 px-3 py-2">
            <p className="text-[10px] font-mono text-neutral-400 break-all">{error.message}</p>
            {error.digest && (
              <p className="text-[10px] font-mono text-neutral-300 mt-0.5">ID: {error.digest}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 h-9 border border-black
                       bg-black text-white text-[11px] font-mono uppercase tracking-wider
                       hover:bg-neutral-800 transition-colors rounded-none"
          >
            <RefreshCw size={12} />
            Retry
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center justify-center gap-2 h-9 border border-neutral-300
                       text-neutral-600 text-[11px] font-mono uppercase tracking-wider
                       hover:border-black hover:text-black transition-colors rounded-none"
          >
            <ArrowLeft size={12} />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
