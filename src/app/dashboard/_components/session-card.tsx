"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Session } from "@/lib/supabase/types";

interface SessionCardProps {
  session: Session;
  entryCount: number;
  currentUserId: string | undefined;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function SessionCard({ session, entryCount, currentUserId }: SessionCardProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [secretCode, setSecretCode] = useState("");

  function openDeleteDialog() {
    setSecretCode("");
    setDeleteOpen(true);
  }
  function closeDeleteDialog() {
    setSecretCode("");
    setDeleteOpen(false);
  }

  // isOwner: email match (new records) OR no '@' = old uid format (single-user app, must be you)
  const isOwner = session.created_by === currentUserId
    || (!!session.created_by && !session.created_by.includes("@"));
  const isActive = session.ended_at === null;

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${session.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success(`Session "${session.name}" deleted`);
      setDeleteOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast.error(msg);
      setDeleting(false);
    }
  }

  return (
    <>
      <article className="border border-neutral-200 bg-white p-5 flex flex-col gap-4
                          hover:border-neutral-400 transition-colors">
        {/* Top row: name + status badge */}
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-sm font-semibold text-black leading-snug">{session.name}</h2>
          {isActive ? (
            <span className="shrink-0 text-[9px] uppercase tracking-[0.15em] border border-black
                             px-2 py-0.5 text-black font-medium">
              Active
            </span>
          ) : (
            <span className="shrink-0 text-[9px] uppercase tracking-[0.15em] border border-neutral-300
                             px-2 py-0.5 text-neutral-400">
              Closed
            </span>
          )}
        </div>

        {/* Meta row */}
        <dl className="grid grid-cols-2 gap-y-2 gap-x-4">
          <div>
            <dt className="text-[9px] uppercase tracking-[0.15em] text-neutral-400 mb-0.5">Started</dt>
            <dd className="font-mono text-[11px] text-neutral-700">{formatDate(session.started_at)}</dd>
          </div>
          <div>
            <dt className="text-[9px] uppercase tracking-[0.15em] text-neutral-400 mb-0.5">Entries</dt>
            <dd className="font-mono text-[11px] text-neutral-700">{entryCount}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[9px] uppercase tracking-[0.15em] text-neutral-400 mb-0.5">Created by</dt>
            <dd className="font-mono text-[11px] text-neutral-700">
              {isOwner
                ? "You"
                : session.created_by ?? "—"}
            </dd>
          </div>
        </dl>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto pt-2 border-t border-neutral-100">
          <a
            href={`/session/${session.id}/chart`}
            className="flex-1 text-center text-xs font-medium bg-black text-white
                       py-2 hover:bg-neutral-800 transition-colors rounded-none"
          >
            Open
          </a>
          <button
              onClick={() => openDeleteDialog()}
              className="flex-1 text-xs border border-neutral-300 text-neutral-500
                         py-2 hover:border-red-400 hover:text-red-600 transition-colors rounded-none"
            >
              Delete
            </button>
        </div>
      </article>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={(open) => { if (!open) closeDeleteDialog(); }}>
        <DialogContent className="rounded-none border border-neutral-200 shadow-none bg-white max-w-sm p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-base font-semibold text-black">
              Delete session?
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-500 mt-1 leading-relaxed">
              <span className="font-semibold text-black">{session.name}</span> and all{" "}
              <span className="font-mono">{entryCount}</span> entr
              {entryCount === 1 ? "y" : "ies"} inside it will be permanently deleted.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4">
            <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 mb-1.5">
              Enter secret code to confirm
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={secretCode}
              onChange={(e) => setSecretCode(e.target.value)}
              placeholder="••••"
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-sm font-mono
                         text-black focus:outline-none focus:border-black transition-colors rounded-none
                         placeholder:text-neutral-300"
              autoComplete="off"
            />
            {secretCode.length > 0 && secretCode !== "2612" && (
              <p className="mt-1 text-[11px] text-red-600">Incorrect code</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={closeDeleteDialog}
              disabled={deleting}
              className="flex-1 border border-neutral-300 bg-white text-sm text-neutral-600
                         py-2 hover:border-black hover:text-black transition-colors rounded-none
                         disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting || secretCode !== "2612"}
              className="flex-1 bg-black text-white text-sm font-medium py-2
                         hover:bg-red-700 transition-colors rounded-none
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

