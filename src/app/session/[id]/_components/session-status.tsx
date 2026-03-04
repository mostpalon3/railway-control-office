"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionStatusProps {
  sessionId: string;
}

type ConnState = "connecting" | "live" | "error";

export function SessionStatus({ sessionId }: SessionStatusProps) {
  const [conn,      setConn]      = useState<ConnState>("connecting");
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // Heartbeat — tell the server we're here every 20 s
    async function heartbeat() {
      await fetch(`/api/presence/${sessionId}`, { method: "POST" }).catch(() => {});
    }

    // Poll presence count every 15 s
    async function poll() {
      try {
        const res = await fetch(`/api/presence/${sessionId}`);
        if (!res.ok) throw new Error();
        const { count } = await res.json();
        if (!cancelled) {
          setUserCount(count);
          setConn("live");
        }
      } catch {
        if (!cancelled) setConn("error");
      }
    }

    // Single-user app — no need to poll a presence count.
    // Just do one initial heartbeat to confirm connectivity, then
    // keep a slow heartbeat every 60 s so the server knows we're here.
    heartbeat();
    poll();
    const beatInterval = setInterval(heartbeat, 60_000);

    return () => {
      cancelled = true;
      clearInterval(beatInterval);
    };
  }, [sessionId]);

  const dotColor = {
    connecting: "bg-neutral-300",
    live:       "bg-emerald-500",
    error:      "bg-red-400",
  }[conn];

  const label = {
    connecting: "Connecting…",
    live:       "Live",
    error:      "Offline",
  }[conn];

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* ── Realtime dot ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1">
        <span
          className={cn(
            "inline-block w-1.5 h-1.5 rounded-full shrink-0",
            dotColor,
            conn === "live" && "animate-pulse"
          )}
        />
        <span
          className={cn(
            "font-mono text-[9px] uppercase tracking-wider",
            conn === "live"  ? "text-emerald-600" :
            conn === "error" ? "text-red-500"      : "text-neutral-400"
          )}
        >
          {label}
        </span>
      </div>

      {/* ── Online user count ─────────────────────────────────────────── */}
      {conn === "live" && userCount > 0 && (
        <div className="flex items-center gap-1 text-neutral-400" title={`${userCount} user${userCount !== 1 ? "s" : ""} viewing`}>
          <Users size={10} />
          <span className="font-mono text-[9px]">{userCount}</span>
        </div>
      )}
    </div>
  );
}
