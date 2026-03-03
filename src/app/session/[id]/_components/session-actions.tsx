"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Download, Trash2, Save, Loader2, Check, X } from "lucide-react";
import type { Entry } from "@/lib/supabase/types";

interface SessionActionsProps {
  sessionId: string;
  sessionName: string;
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────
function escapeCsv(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function entriesToCsv(entries: Entry[]): string {
  const headers = ["LOCO 1", "Chart No", "S.No", "LOCO 2", "Train No", "Station", "Date"];
  const rows = entries.map((e) => [
    e.loco1,
    e.chart_no,
    String(e.sno),
    e.loco2 ?? "",
    e.train_no,
    e.station,
    e.date,
  ]);
  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function fetchEntries(sessionId: string): Promise<Entry[]> {
  const res = await fetch(`/api/entries?session_id=${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch entries");
  return res.json();
}

// ─── component ────────────────────────────────────────────────────────────────
export function SessionActions({ sessionId, sessionName }: SessionActionsProps) {
  const router = useRouter();
  const [saving,        setSaving]       = useState(false);
  const [exporting,     setExporting]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]     = useState(false);

  // ── Save Session ────────────────────────────────────────────────────────────
  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const entries = await fetchEntries(sessionId);
      const sorted  = [...entries].sort(
        (a, b) => a.chart_no.localeCompare(b.chart_no) || a.sno - b.sno
      );

      // Mark session as ended
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ended_at: new Date().toISOString() }),
      });

      const csv      = entriesToCsv(sorted);
      const safeName = sessionName.replace(/[^a-z0-9_\- ]/gi, "_").trim();
      downloadCsv(csv, `${safeName || sessionId}.csv`);

      toast.success("Session saved and CSV downloaded");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
    setSaving(false);
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────
  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const entries = await fetchEntries(sessionId);
      const sorted  = [...entries].sort(
        (a, b) => a.chart_no.localeCompare(b.chart_no) || a.sno - b.sno
      );
      const csv      = entriesToCsv(sorted);
      const safeName = sessionName.replace(/[^a-z0-9_\- ]/gi, "_").trim();
      downloadCsv(csv, `${safeName || sessionId}.csv`);
      toast.success("CSV downloaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
    setExporting(false);
  }

  // ── Delete Session ──────────────────────────────────────────────────────────
  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      toast.success("Session deleted");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  // ─── render ─────────────────────────────────────────────────────────────────
  const btnBase =
    "flex items-center justify-center gap-1.5 px-2 sm:px-3 h-8 text-[10px] font-mono " +
    "uppercase tracking-wider border transition-colors rounded-none disabled:opacity-40 whitespace-nowrap";

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-2 ml-auto">
        <span className="hidden sm:block text-[10px] font-mono text-neutral-600">
          Delete session &amp; all entries?
        </span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`${btnBase} border-red-500 bg-red-500 text-white hover:bg-red-600`}
          title="Yes, delete"
        >
          {deleting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
          <span className="hidden sm:inline">{deleting ? "Deleting…" : "Yes, delete"}</span>
        </button>
        <button
          onClick={() => setConfirmDelete(false)}
          disabled={deleting}
          className={`${btnBase} border-neutral-300 text-neutral-600 hover:border-black hover:text-black`}
          title="Cancel"
        >
          <X size={13} />
          <span className="hidden sm:inline">Cancel</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 ml-auto">
      {/* Back to dashboard */}
      <button
        onClick={() => router.push("/dashboard")}
        className={`${btnBase} border-neutral-300 text-neutral-600 hover:border-black hover:text-black`}
        title="Back to dashboard"
      >
        <ArrowLeft size={13} />
        <span className="hidden sm:inline">Dashboard</span>
      </button>

      {/* Export CSV */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className={`${btnBase} border-neutral-300 text-neutral-600 hover:border-black hover:text-black`}
        title="Export CSV"
      >
        {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export CSV"}</span>
      </button>

      {/* Delete Session */}
      <button
        onClick={() => setConfirmDelete(true)}
        className={`${btnBase} border-neutral-300 text-neutral-500 hover:border-red-400 hover:text-red-600`}
        title="Delete session"
      >
        <Trash2 size={13} />
        <span className="hidden sm:inline">Delete</span>
      </button>

      {/* Save Session */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`${btnBase} border-black bg-black text-white hover:bg-neutral-800`}
        title="Save session"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
        <span className="hidden sm:inline">{saving ? "Saving…" : "Save"}</span>
      </button>
    </div>
  );
}


