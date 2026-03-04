"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { entrySchema, type EntryFormValues, CHART_NO_VALUES } from "@/lib/validations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ChartNo, Sno, Entry } from "@/lib/supabase/types";
import { ScanModal, type ScanResult } from "@/components/ScanModal";
import { ScanText, Loader2 } from "lucide-react";

// ─── constants ────────────────────────────────────────────────────────────────
const CHART_OPTIONS = [...CHART_NO_VALUES] as ChartNo[];
const SNO_OPTIONS = Array.from({ length: 21 }, (_, i) => i + 1) as Sno[];

// Today as YYYY-MM-DD
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ─── props ────────────────────────────────────────────────────────────────────
interface EntryFormProps {
  sessionId: string;
  existingLoco1s: string[];               // known loco1 values in this session
  onEntrySaved?: (entry: Entry) => void;  // callback to update parent list
}

// ─── component ───────────────────────────────────────────────────────────────
export function EntryForm({ sessionId, existingLoco1s, onEntrySaved }: EntryFormProps) {
  const [showScan,   setShowScan]   = useState(false);
  const [isSaving,   setIsSaving]   = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      session_id: sessionId,
      loco1: "",
      loco2: "",
      train_no: "",
      station: "",
      chart_no: "" as EntryFormValues["chart_no"],
      sno: 0,   // sentinel: 0 fails min(1), acts as "not selected"
      date: todayISO(),
    },
  });

  // Keep session_id and date in sync
  useEffect(() => {
    setValue("session_id", sessionId);
    setValue("date", todayISO());
  }, [sessionId, setValue]);

  const watchedChartNo = watch("chart_no");
  const watchedSno = watch("sno");

  async function attemptSave(values: EntryFormValues) {
    setIsSaving(true);

    // 1. Optimistic duplicate check from parent list
    if (existingLoco1s.includes(values.loco1.trim())) {
      setError("loco1", {
        type: "manual",
        message: `Loco ${values.loco1} is already entered in this session`,
      });
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: values.session_id,
          loco1:      values.loco1.trim(),
          loco2:      values.loco2?.trim() || null,
          train_no:   values.train_no.trim(),
          station:    values.station.trim(),
          chart_no:   values.chart_no,
          sno:        values.sno,
          date:       values.date,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setError("loco1", { type: "manual", message: body.error ?? `Loco ${values.loco1} already entered` });
          setIsSaving(false);
          return;
        }
        throw new Error(body?.error ?? "Save failed");
      }

      const newEntry: Entry = await res.json();

      toast.success("Entry saved \u2713", { duration: 1500 });
      onEntrySaved?.(newEntry);
      reset({
        session_id: sessionId,
        loco1: "",
        loco2: "",
        train_no: "",
        station: "",
        chart_no: "" as EntryFormValues["chart_no"],
        sno: 0,
        date: todayISO(),
      });
      // Return focus to loco1 so the operator can immediately key in the next entry
      setTimeout(() => (document.getElementById("loco1") as HTMLInputElement | null)?.focus(), 30);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
    setIsSaving(false);
  }

  // ─── handle scanned result ─────────────────────────────────────────────────
  function handleScanApply(result: ScanResult) {
    if (result.loco1)    setValue("loco1",    result.loco1,    { shouldValidate: true });
    if (result.loco2)    setValue("loco2",    result.loco2,    { shouldValidate: true });
    if (result.train_no) setValue("train_no", result.train_no, { shouldValidate: true });
    if (result.station)  setValue("station",  result.station,  { shouldValidate: true });
    if (result.chart_no) setValue("chart_no", result.chart_no, { shouldValidate: true });
    // Pre-select sno tile but do NOT auto-save — user confirms by tapping the tile
    if (result.sno)      setValue("sno",      result.sno,      { shouldValidate: false });
    toast.success("Form pre-filled from scan", { duration: 2000 });
  }

  // Called when user taps an SNO option — setValue updates RHF's internal ref
  // synchronously, so handleSubmit sees the new value immediately.
  function handleSnoSelect(value: Sno) {
    setValue("sno", value, { shouldValidate: true });
    handleSubmit(attemptSave)();
  }

  // ─── shared class helpers ──────────────────────────────────────────────────
  const inputCls =
    "w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-black font-mono " +
    "placeholder:text-neutral-300 focus:outline-none focus:border-black transition-colors rounded-none";

  const labelCls =
    "block text-[10px] font-medium text-neutral-500 uppercase tracking-[0.15em] mb-1.5";

  function radioTileCls(selected: boolean) {
    return cn(
      "flex items-center justify-center h-9 min-w-[2.25rem] px-1 border text-xs font-mono",
      "cursor-pointer select-none transition-colors",
      selected
        ? "bg-black text-white border-black"
        : "bg-white text-neutral-700 border-neutral-300 hover:border-black hover:text-black"
    );
  }

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Scan Document button ──────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowScan(true)}
        className="w-full mb-3 h-9 flex items-center justify-center gap-2
                   border border-black text-xs font-mono uppercase tracking-wider
                   text-black hover:bg-black hover:text-white transition-colors rounded-none"
      >
        <ScanText size={13} />
        Scan Document
      </button>

      {/* ── Entry form ────────────────────────────────────────────────────── */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="bg-white border border-neutral-200 p-6 space-y-6"
        noValidate
      >
      {/* ── Row 1: Loco 1 + Loco 2 ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="loco1" className={labelCls}>
            Loco 1 <span className="text-black">*</span>
          </label>
          <input
            id="loco1"
            inputMode="numeric"
            {...register("loco1")}
            className={inputCls}
            placeholder="e.g. 12345"
          />
          {errors.loco1 && (
            <p className="mt-1 text-[11px] text-red-600">{errors.loco1.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="loco2" className={labelCls}>
            Loco 2{" "}
            <span className="text-neutral-300 normal-case tracking-normal text-[9px]">
              optional
            </span>
          </label>
          <input
            id="loco2"
            inputMode="numeric"
            {...register("loco2")}
            className={inputCls}
            placeholder="e.g. 67890"
          />
        </div>
      </div>

      {/* ── Row 2: Train Name + Station ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="train_no" className={labelCls}>
            Train Name <span className="text-black">*</span>
          </label>
          <input
            id="train_no"
            type="text"
            {...register("train_no")}
            className={inputCls}
            placeholder="e.g. Rajdhani Express"
          />
          {errors.train_no && (
            <p className="mt-1 text-[11px] text-red-600">{errors.train_no.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="station" className={labelCls}>
            Station <span className="text-black">*</span>
          </label>
          <input
            id="station"
            {...register("station")}
            className={inputCls}
            placeholder="e.g. NDLS"
          />
          {errors.station && (
            <p className="mt-1 text-[11px] text-red-600">{errors.station.message}</p>
          )}
        </div>
      </div>

      {/* ── Chart No radio grid ─────────────────────────────────────────── */}
      <div>
        <p className={labelCls}>
          Chart No <span className="text-black">*</span>
        </p>
        <Controller
          control={control}
          name="chart_no"
          render={({ field }) => (
            <div className="flex flex-wrap gap-1.5">
              {CHART_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    field.onChange(opt);
                    setValue("chart_no", opt, { shouldValidate: true });
                  }}
                  className={radioTileCls(field.value === opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        />
        {errors.chart_no && (
          <p className="mt-1.5 text-[11px] text-red-600">{errors.chart_no.message as string}</p>
        )}
      </div>

      {/* ── S.No radio grid — selecting triggers auto-save ─────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className={cn(labelCls, "mb-0")}>
            S. No <span className="text-black">*</span>
          </p>
          {watchedSno && !isSaving && (
            <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">
              Tap to auto-save
            </span>
          )}
          {isSaving && (
            <span className="flex items-center gap-1 text-[9px] font-mono text-neutral-500 uppercase tracking-widest">
              <Loader2 size={10} className="animate-spin" />
              Saving…
            </span>
          )}
          {!watchedSno && !isSaving && (
            <span className="text-[9px] font-mono text-neutral-300 uppercase tracking-widest">
              Select to save
            </span>
          )}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {SNO_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={isSaving}
              onClick={() => handleSnoSelect(n)}
              className={cn(radioTileCls(watchedSno === n), "disabled:opacity-40")}
            >
              {n}
            </button>
          ))}
        </div>
        {errors.sno && (
          <p className="mt-1.5 text-[11px] text-red-600">{errors.sno.message}</p>
        )}
      </div>

      {/* ── Hidden fields ───────────────────────────────────────────────── */}
      <input type="hidden" {...register("session_id")} />
      <input type="hidden" {...register("date")} />

      {/* ── Status hint ─────────────────────────────────────────────────── */}
      <p className="text-[10px] text-neutral-400 font-mono">
        Fill all required fields, then select S. No to auto-save.
      </p>
    </form>

    {/* ── Scan modal (portal-style, rendered in-tree) ──────────────── */}
    {showScan && (
      <ScanModal
        onClose={() => setShowScan(false)}
        onApply={handleScanApply}
      />
    )}
  </>
  );
}
