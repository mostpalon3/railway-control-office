"use client";

import { useEffect, useState, useMemo, useCallback, Fragment } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntryForm } from "@/components/EntryForm";
import type { Entry, ChartNo, Sno } from "@/lib/supabase/types";
import { CHART_NO_VALUES } from "@/lib/validations";

// ─── highlight helper ────────────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>;
  const lower     = query.toLowerCase();
  const lowerText = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let last = 0;
  let idx  = lowerText.indexOf(lower, last);
  while (idx !== -1) {
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(
      <mark key={idx} className="bg-yellow-200 text-inherit rounded-none not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
    );
    last = idx + query.length;
    idx  = lowerText.indexOf(lower, last);
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

// ─── types ────────────────────────────────────────────────────────────────────
type GroupBy = "train_no" | "station" | "chart_no" | "shutdown";

interface EntriesViewProps {
  sessionId: string;
  initialEntries: Entry[];
  groupBy: GroupBy;
  filterShutdown?: boolean;  // if true, show only shutdown entries
}

// ─── date/time display helper ─────────────────────────────────────────────────
function formatDateTime(value: string): { date: string; time: string | null } {
  if (!value) return { date: "—", time: null };
  if (value.includes("T")) {
    const [datePart, timePart] = value.split("T");
    return { date: datePart, time: timePart.slice(0, 5) };
  }
  return { date: value, time: null };
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function sortGroupKeys(keys: string[], groupBy: GroupBy): string[] {
  if (groupBy === "chart_no") {
    const order = [...CHART_NO_VALUES];
    return [...keys].sort(
      (a, b) => order.indexOf(a as ChartNo) - order.indexOf(b as ChartNo)
    );
  }
  if (groupBy === "train_no") {
    return [...keys].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
  }
  if (groupBy === "shutdown") {
    // "true" (Shutdown) first, then "false" (Active)
    return [...keys].sort((a, b) => (a === "true" ? -1 : 1) - (b === "true" ? -1 : 1));
  }
  return [...keys].sort((a, b) => a.localeCompare(b));
}

function formatGroupKey(key: string, groupBy: GroupBy): string {
  if (groupBy === "shutdown") return key === "true" ? "Shutdown" : "Active";
  return key;
}

function matchesSearch(entry: Entry, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return [
    entry.loco1,
    entry.loco2 ?? "",
    entry.train_no,
    entry.station,
    entry.chart_no,
    String(entry.sno),
    entry.date,
  ]
    .join(" ")
    .toLowerCase()
    .includes(lower);
}

const SNO_OPTIONS = Array.from({ length: 21 }, (_, i) => i + 1) as Sno[];

// ─── inline-edit row ──────────────────────────────────────────────────────────
type EditState = Omit<Entry, "id" | "session_id" | "created_by" | "created_at">;

function blankEdit(entry: Entry): EditState {
  return {
    loco1:    entry.loco1,
    loco2:    entry.loco2,
    train_no: entry.train_no,
    station:  entry.station,
    chart_no: entry.chart_no,
    sno:      entry.sno,
    date:     entry.date,
    shutdown: entry.shutdown ?? false,
  };
}

// ─── component ───────────────────────────────────────────────────────────────
export function EntriesView({
  sessionId,
  initialEntries,
  groupBy,
  filterShutdown = false,
}: EntriesViewProps) {
  // ── URL params ────────────────────────────────────────────────────────────
  const searchParams = useSearchParams();
  const search   = searchParams.get("q") ?? "";
  const formOpen = searchParams.get("form") === "1";
  const router   = useRouter();
  const pathname = usePathname();

  // ── state ──────────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [realtimeOk, setRealtimeOk] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Polling for realtime updates (every 4 seconds) ────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/entries?session_id=${sessionId}`);
        if (!res.ok) return;
        const fresh: Entry[] = await res.json();
        if (!cancelled) {
          setEntries(fresh);
          setRealtimeOk(true);
        }
      } catch {
        if (!cancelled) setRealtimeOk(false);
      }
    }

    poll();
    const interval = setInterval(poll, 8000);

    // Skip polls while the tab is backgrounded; catch up immediately on return
    const onVisible = () => { if (!document.hidden) poll(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // ── callback: add entry from form (optimistic) ─────────────────────────────
  const handleEntrySaved = useCallback((entry: Entry) => {
    setEntries((prev) => {
      if (prev.find((e) => e.id === entry.id)) return prev;
      return [entry, ...prev];
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── existing loco1s for duplicate check ────────────────────────────────────
  const existingLoco1s = useMemo(() => entries.map((e) => e.loco1), [entries]);

  // ── filtered + grouped entries ─────────────────────────────────────────────
  const filtered = useMemo(
    () => entries.filter((e) => {
      if (filterShutdown && !e.shutdown) return false;
      return matchesSearch(e, search);
    }),
    [entries, search, filterShutdown]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of filtered) {
      const raw = groupBy === "shutdown" ? String(e.shutdown) : (e[groupBy as Exclude<GroupBy, "shutdown">] ?? "—");
      const key = String(raw);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    // Sort within each group by sno
    for (const arr of map.values()) arr.sort((a, b) => a.sno - b.sno);
    return map;
  }, [filtered, groupBy]);

  const sortedKeys = useMemo(
    () => sortGroupKeys([...grouped.keys()], groupBy),
    [grouped, groupBy]
  );

  // ── delete ─────────────────────────────────────────────────────────────────
  function requestDelete(id: string) {
    setEditingId(null);          // close any open edit row
    setEditValues(null);
    setEditError(null);
    setConfirmDeleteId(id);
  }

  async function confirmDelete(id: string) {
    setDeletingId(id);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Entry deleted");
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
    setDeletingId(null);
  }

  // ── edit ───────────────────────────────────────────────────────────────────
  function startEdit(entry: Entry) {
    setConfirmDeleteId(null);    // close any pending delete confirm
    setEditingId(entry.id);
    setEditValues(blankEdit(entry));
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues(null);
    setEditError(null);
  }

  async function saveEdit(id: string) {
    if (!editValues || saving) return;
    setEditError(null);

    // Loco1 uniqueness — exclude the row being edited
    const trimmedLoco1 = editValues.loco1.trim().toUpperCase();
    const conflict = entries.find(
      (e) => e.id !== id && e.loco1.trim().toUpperCase() === trimmedLoco1
    );
    if (conflict) {
      setEditError(`Loco 1 "${editValues.loco1.trim()}" already exists in this session.`);
      return;
    }
    if (!trimmedLoco1) {
      setEditError("Loco 1 cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loco1:    editValues.loco1.trim(),
          loco2:    editValues.loco2?.trim() || null,
          train_no: editValues.train_no.trim(),
          station:  editValues.station.trim(),
          chart_no: editValues.chart_no,
          sno:      editValues.sno,
          date:     editValues.date,
          shutdown: editValues.shutdown,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Entry updated");
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...editValues } : e))
      );
      cancelEdit();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
    setSaving(false);
  }

  function editField(field: keyof EditState, value: string | number | boolean | null) {
    setEditValues((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  // ── shared styles ──────────────────────────────────────────────────────────
  const cellCls = "px-3 py-2 font-mono text-xs text-neutral-700 whitespace-nowrap";
  const editInputCls =
    "w-full border border-neutral-400 bg-white px-1.5 py-1 text-xs font-mono " +
    "text-black focus:outline-none focus:border-black rounded-none min-w-0";

  const groupLabel: Record<GroupBy, string> = {
    train_no: "Train Name",
    station: "Station",
    chart_no: "Chart No.",
    shutdown: "Status",
  };

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* ── Left: grouped table ───────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Results count + realtime data-status pill */}
        <div className="flex items-center justify-between mb-3 min-h-[1.25rem]">
          {search ? (
            <p className="text-[10px] font-mono text-neutral-400">
              {filtered.length} result{filtered.length !== 1 ? "s" : ""} for{" "}
              <span className="text-black">&ldquo;{search}&rdquo;</span>
            </p>
          ) : (
            <p className="text-[10px] font-mono text-neutral-400">
              {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
            </p>
          )}
          {/* data-channel connection pill (separate from presence indicator in header) */}
          {!realtimeOk && (
            <span className="text-[9px] font-mono text-neutral-300 uppercase tracking-wider">
              syncing…
            </span>
          )}
        </div>

        {/* Grouped tables */}
        {sortedKeys.length === 0 ? (
          <div className="border border-dashed border-neutral-200 py-16 text-center">
            <p className="text-xs text-neutral-400 font-mono">
              {search ? "No entries match your search." : "No entries yet. Use the form to add one."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 sm:mx-0">
            <div className="space-y-6 min-w-[640px] px-6 sm:px-0">
            {sortedKeys.map((key) => {
              const rows = grouped.get(key) ?? [];
              return (
                <div key={key} className="border border-neutral-200">
                  {/* Group header */}
                  <div className={cn(
                    "px-4 py-2 border-b border-neutral-200 flex items-center gap-2",
                    groupBy === "shutdown" && key === "true"
                      ? "bg-red-50"
                      : groupBy === "shutdown" && key === "false"
                      ? "bg-green-50"
                      : "bg-neutral-50"
                  )}>
                    <span className="text-[9px] uppercase tracking-[0.15em] text-neutral-400 font-medium">
                      {groupLabel[groupBy]}
                    </span>
                    <span className={cn(
                      "font-mono text-sm font-semibold",
                      groupBy === "shutdown" && key === "true" ? "text-red-700" :
                      groupBy === "shutdown" && key === "false" ? "text-green-700" :
                      "text-black"
                    )}>{formatGroupKey(key, groupBy)}</span>
                    <span className="ml-auto font-mono text-[10px] text-neutral-400">
                      {rows.length} entr{rows.length !== 1 ? "ies" : "y"}
                    </span>
                  </div>

                  {/* Table */}
                  <div>
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-neutral-100">
                          {["LOCO 1", "Chart No", "S.No", "LOCO 2", "Train Name", "Station", "Date", "SD", ""].map(
                            (h, i) => (
                              <th
                                key={i}
                                className="text-left text-[9px] uppercase tracking-[0.15em]
                                           font-medium text-neutral-400 px-3 py-2 whitespace-nowrap"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((entry, rowIdx) => {
                          const isEditing = editingId === entry.id;
                          const isConfirmingDelete = confirmDeleteId === entry.id;
                          const isDeleting = deletingId === entry.id;
                          const rowBg = rowIdx % 2 === 0 ? "bg-white" : "bg-neutral-50/60";

                          return (
                            <Fragment key={entry.id}>
                            <tr
                              className={cn(
                                "border-b border-neutral-100 group",
                                isEditing ? "border-b-0" : "last:border-0",
                                rowBg,
                                isEditing && "bg-amber-50/30",
                                isConfirmingDelete && "bg-red-50/30"
                              )}
                            >
                              {isEditing && editValues ? (
                                <>
                                  {/* Inline edit cells */}
                                  <td className="px-2 py-1.5">
                                    <input
                                      className={editInputCls}
                                      value={editValues.loco1}
                                      onChange={(e) => editField("loco1", e.target.value)}
                                      style={{ width: "6rem" }}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <select
                                      className={editInputCls}
                                      value={editValues.chart_no}
                                      onChange={(e) => editField("chart_no", e.target.value as ChartNo)}
                                      style={{ width: "4.5rem" }}
                                    >
                                      {CHART_NO_VALUES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <select
                                      className={editInputCls}
                                      value={editValues.sno}
                                      onChange={(e) => editField("sno", Number(e.target.value) as Sno)}
                                      style={{ width: "3.5rem" }}
                                    >
                                      {SNO_OPTIONS.map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      className={editInputCls}
                                      value={editValues.loco2 ?? ""}
                                      onChange={(e) => editField("loco2", e.target.value)}
                                      style={{ width: "6rem" }}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      className={editInputCls}
                                      value={editValues.train_no}
                                      onChange={(e) => editField("train_no", e.target.value)}
                                      style={{ width: "5.5rem" }}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      className={editInputCls}
                                      value={editValues.station}
                                      onChange={(e) => editField("station", e.target.value)}
                                      style={{ width: "6rem" }}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="datetime-local"
                                      className={editInputCls}
                                      value={editValues.date}
                                      onChange={(e) => editField("date", e.target.value)}
                                      style={{ width: "11rem" }}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <button
                                      type="button"
                                      onClick={() => editField("shutdown", !editValues.shutdown)}
                                      className={cn(
                                        "px-2 py-1 text-[10px] font-mono border transition-colors rounded-none",
                                        editValues.shutdown
                                          ? "bg-red-500 border-red-500 text-white"
                                          : "bg-white border-neutral-300 text-neutral-500 hover:border-black"
                                      )}
                                    >
                                      {editValues.shutdown ? "Yes" : "No"}
                                    </button>
                                  </td>
                                  {/* Save / Cancel */}
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => saveEdit(entry.id)}
                                        disabled={saving}
                                        className="p-1.5 border border-black bg-black text-white
                                                   hover:bg-neutral-800 transition-colors disabled:opacity-40
                                                   rounded-none"
                                        title="Save"
                                      >
                                        <Check size={12} />
                                      </button>
                                      <button
                                        onClick={cancelEdit}
                                        className="p-1.5 border border-neutral-300 text-neutral-500
                                                   hover:border-black hover:text-black transition-colors
                                                   rounded-none"
                                        title="Cancel"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : isConfirmingDelete ? (
                                <>
                                  {/* Delete confirmation — spans full width via colSpan trick */}
                                  <td colSpan={8} className="px-3 py-2">
                                    <span className="font-mono text-xs text-neutral-600">
                                      Delete entry for loco{" "}
                                      <strong className="text-black">{entry.loco1}</strong>?
                                    </span>
                                  </td>
                                  <td className="px-2 py-1.5 whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => confirmDelete(entry.id)}
                                        disabled={isDeleting}
                                        className="px-2.5 py-1 border border-red-500 bg-red-500
                                                   text-white text-[10px] font-mono uppercase tracking-wider
                                                   hover:bg-red-600 transition-colors disabled:opacity-40
                                                   rounded-none"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteId(null)}
                                        className="px-2.5 py-1 border border-neutral-300 text-neutral-600
                                                   text-[10px] font-mono uppercase tracking-wider
                                                   hover:border-black hover:text-black transition-colors
                                                   rounded-none"
                                      >
                                        No
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  {/* Display cells — matched text highlighted */}
                                  <td className={cn(cellCls, "font-semibold text-black")}>
                                    <Highlight text={entry.loco1} query={search} />
                                  </td>
                                  <td className={cellCls}>
                                    <Highlight text={entry.chart_no} query={search} />
                                  </td>
                                  <td className={cellCls}>
                                    <Highlight text={String(entry.sno)} query={search} />
                                  </td>
                                  <td className={cn(cellCls, "text-neutral-400")}>
                                    <Highlight text={entry.loco2 ?? "—"} query={search} />
                                  </td>
                                  <td className={cellCls}>
                                    <Highlight text={entry.train_no} query={search} />
                                  </td>
                                  <td className={cellCls}>
                                    <Highlight text={entry.station} query={search} />
                                  </td>
                                  <td className={cellCls}>
                                    {(() => {
                                      const { date, time } = formatDateTime(entry.date);
                                      return (
                                        <span className="flex flex-col leading-tight">
                                          <Highlight text={date} query={search} />
                                          {time && (
                                            <span className="text-[10px] text-neutral-400 font-mono">{time}</span>
                                          )}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-3 py-2">
                                    {entry.shutdown ? (
                                      <span className="text-[9px] uppercase tracking-wider font-medium
                                                       border border-red-300 text-red-600 px-1 py-0.5">
                                        Yes
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-neutral-300 font-mono">—</span>
                                    )}
                                  </td>
                                  {/* Edit / Delete */}
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => startEdit(entry)}
                                        className="p-1.5 border border-neutral-300 text-neutral-500
                                                   hover:border-black hover:text-black transition-colors
                                                   rounded-none"
                                        title="Edit"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        onClick={() => requestDelete(entry.id)}
                                        disabled={isDeleting}
                                        className="p-1.5 border border-neutral-300 text-neutral-500
                                                   hover:border-red-400 hover:text-red-600 transition-colors
                                                   disabled:opacity-40 rounded-none"
                                        title="Delete"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                            {/* Inline edit error row */}
                            {isEditing && editError && (
                              <tr className={cn(rowBg, "bg-amber-50/30")}>
                                <td colSpan={8} className="px-3 pb-2">
                                  <p className="text-[10px] font-mono text-red-600">{editError}</p>
                                </td>
                              </tr>
                            )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Entry form ──────────────────────────────────────────────
           Desktop (xl+): always-visible sidebar.
           Mobile: fixed full-screen overlay when ?form=1. */}
      <aside className={cn(
        "xl:w-80 xl:shrink-0 xl:order-last xl:block",
        formOpen
          ? "fixed inset-0 z-50 bg-white overflow-y-auto xl:relative xl:inset-auto xl:z-auto"
          : "hidden xl:block"
      )}>
        {/* Mobile-only close header */}
        <div className="xl:hidden flex items-center justify-between px-4 h-12 border-b border-neutral-200 sticky top-0 bg-white z-10">
          <span className="text-[11px] font-mono uppercase tracking-[0.15em] text-neutral-500">New Entry</span>
          <button
            onClick={() => {
              const next = new URLSearchParams(searchParams.toString());
              next.delete("form");
              router.replace(`${pathname}?${next.toString()}`, { scroll: false });
            }}
            className="h-8 w-8 flex items-center justify-center border border-neutral-300
                       text-neutral-500 hover:border-black hover:text-black transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 xl:p-0">
          <p className="hidden xl:block text-[10px] uppercase tracking-[0.15em] text-neutral-400 font-medium mb-2">
            New Entry
          </p>
          <EntryForm
            sessionId={sessionId}
            existingLoco1s={existingLoco1s}
            onEntrySaved={handleEntrySaved}
          />
        </div>
      </aside>
    </div>
  );
}
