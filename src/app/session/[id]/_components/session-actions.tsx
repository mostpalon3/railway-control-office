"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Download, Printer, Trash2, Save, Loader2, Check, X, RefreshCw, Palette } from "lucide-react";
import * as XLSX from "xlsx";
import type { Entry } from "@/lib/supabase/types";
import { CHART_NO_VALUES } from "@/lib/validations";
import { useTheme, THEMES, THEME_LABELS } from "@/lib/ThemeContext";

function sortEntries(entries: Entry[]) {
  return [...entries].sort((a, b) => {
    const ai = CHART_NO_VALUES.indexOf(a.chart_no as typeof CHART_NO_VALUES[number]);
    const bi = CHART_NO_VALUES.indexOf(b.chart_no as typeof CHART_NO_VALUES[number]);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi) || a.sno - b.sno;
  });
}

interface SessionActionsProps {
  sessionId: string;
  sessionName: string;
}

// ─── Excel helpers ────────────────────────────────────────────────────────────
function downloadExcel(entries: Entry[], filename: string) {
  const sorted = sortEntries(entries);
  const rows = sorted.map((e) => ({
    "LOCO 1":     e.loco1,
    "Chart No":   e.chart_no,
    "S.No":       e.sno,
    "LOCO 2":     e.loco2 ?? "",
    "Train Name": e.train_no,
    "Station":    e.station,
    "Date":       e.date,
    "Shutdown":   e.shutdown ? "Yes" : "No",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 6 }, { wch: 14 },
    { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 10 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Entries");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── Print helper ─────────────────────────────────────────────────────────────
function printEntries(entries: Entry[], sessionName: string) {
  const headers = ["LOCO 1", "Chart No", "S.No", "LOCO 2", "Train Name", "Station", "Date", "Shutdown"];
  const rows = sortEntries(entries);
  const thead = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
  const tbody = rows
    .map(
      (e) =>
        `<tr>
          <td>${e.loco1}</td><td>${e.chart_no}</td><td>${e.sno}</td>
          <td>${e.loco2 ?? ""}</td><td>${e.train_no}</td><td>${e.station}</td>
          <td>${e.date}</td>
          <td style="color:${e.shutdown ? "#b91c1c" : "inherit"};font-weight:${e.shutdown ? "bold" : "normal"}">${e.shutdown ? "Yes" : "No"}</td>
        </tr>`
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${sessionName}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Courier New', monospace; font-size: 11px; padding: 20px; }
h1 { font-size: 14px; margin-bottom: 12px; font-family: sans-serif; font-weight: 600; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #999; padding: 4px 8px; text-align: left; white-space: nowrap; }
th { background: #f0f0f0; font-weight: bold; font-family: sans-serif;
     font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; }
tr:nth-child(even) td { background: #fafafa; }
@media print { @page { margin: 15mm; size: landscape; } }
</style></head><body>
<h1>${sessionName} — Entries (${rows.length})</h1>
<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>
</body></html>`;
  const win = window.open("", "_blank", "width=960,height=700");
  if (!win) { toast.error("Popup blocked — allow popups to print"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 300);
}

async function fetchEntries(sessionId: string): Promise<Entry[]> {
  const res = await fetch(`/api/entries?session_id=${sessionId}`);
  if (!res.ok) throw new Error("Failed to fetch entries");
  return res.json();
}

// ─── component ────────────────────────────────────────────────────────────────
export function SessionActions({ sessionId, sessionName }: SessionActionsProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [saving,        setSaving]       = useState(false);
  const [exporting,     setExporting]    = useState(false);
  const [printing,      setPrinting]     = useState(false);
  const [refreshing,    setRefreshing]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting,      setDeleting]     = useState(false);

  // ── Refresh ───────────────────────────────────────────────────────────
  async function handleRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    router.refresh();
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
    toast.success("Page refreshed");
  }

  // ── Save Session ────────────────────────────────────────────────────────────
  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const entries = await fetchEntries(sessionId);
      const sorted  = sortEntries(entries);

      // Mark session as ended
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ended_at: new Date().toISOString() }),
      });

      const safeName = sessionName.replace(/[^a-z0-9_\- ]/gi, "_").trim();
      downloadExcel(sorted, safeName || sessionId);

      toast.success("Session saved and Excel downloaded");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
    setSaving(false);
  }

  // ── Export Excel ─────────────────────────────────────────────────────
  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const entries = await fetchEntries(sessionId);
      const sorted  = sortEntries(entries);
      const safeName = sessionName.replace(/[^a-z0-9_\- ]/gi, "_").trim();
      downloadExcel(sorted, safeName || sessionId);
      toast.success("Excel downloaded");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    }
    setExporting(false);
  }

  // ── Print ────────────────────────────────────────────────────────────
  async function handlePrint() {
    if (printing) return;
    setPrinting(true);
    try {
      const entries = await fetchEntries(sessionId);
      printEntries(entries, sessionName);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Print failed");
    }
    setPrinting(false);
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
      {/* Theme selector */}
      {/* Mobile: cycle icon */}
      <button
        type="button"
        onClick={() => {
          const idx = THEMES.indexOf(theme);
          setTheme(THEMES[(idx + 1) % THEMES.length]);
        }}
        title={THEME_LABELS[theme]}
        className={`sm:hidden ${btnBase} border-neutral-300 text-neutral-600 hover:border-black hover:text-black`}
      >
        <Palette size={13} />
      </button>
      {/* Desktop: full select */}
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as typeof theme)}
        title="Select theme"
        className="hidden sm:block h-7 border border-neutral-300 bg-white text-neutral-600 text-[11px] px-1.5 font-mono
                   focus:outline-none focus:border-black transition-colors cursor-pointer"
      >
        {THEMES.map((t) => (
          <option key={t} value={t}>{THEME_LABELS[t]}</option>
        ))}
      </select>

      {/* Back to dashboard */}
      <button
        onClick={() => router.push("/dashboard")}
        className={`${btnBase} border-neutral-300 text-neutral-600 hover:border-black hover:text-black`}
        title="Back to dashboard"
      >
        <ArrowLeft size={13} />
        <span className="hidden sm:inline">Dashboard</span>
      </button>

      {/* Refresh */}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className={`${btnBase} border-neutral-300 text-neutral-600 hover:border-black hover:text-black`}
        title="Refresh"
      >
        <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
        <span className="hidden sm:inline">{refreshing ? "Refreshing…" : "Refresh"}</span>
      </button>

      {/* Print */}
      <button
        onClick={handlePrint}
        disabled={printing}
        className={`${btnBase} border-neutral-300 text-neutral-600 hover:border-black hover:text-black`}
        title="Print"
      >
        {printing ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
        <span className="hidden sm:inline">{printing ? "Loading…" : "Print"}</span>
      </button>

      {/* Export Excel */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className={`${btnBase} border-neutral-300 text-neutral-600 hover:border-black hover:text-black`}
        title="Export Excel"
      >
        {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
        <span className="hidden sm:inline">{exporting ? "Exporting…" : "Export Excel"}</span>
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


