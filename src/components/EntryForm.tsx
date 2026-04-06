"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { entrySchema, type EntryFormValues, CHART_NO_VALUES } from "@/lib/validations";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ChartNo, Sno, Entry } from "@/lib/supabase/types";
import { Loader2 } from "lucide-react";

// ─── constants ────────────────────────────────────────────────────────────────
const CHART_OPTIONS = [...CHART_NO_VALUES] as ChartNo[];
const SNO_OPTIONS = Array.from({ length: 21 }, (_, i) => i + 1) as Sno[];

// Current date+time as YYYY-MM-DDTHH:MM (datetime-local format)
function nowISO() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`
  );
}

// ─── props ────────────────────────────────────────────────────────────────────
interface EntryFormProps {
  sessionId: string;
  existingLoco1s: string[];               // known loco1 values in this session
  onEntrySaved?: (entry: Entry) => void;  // callback to update parent list
}

// ─── component ───────────────────────────────────────────────────────────────
export function EntryForm({ sessionId, existingLoco1s, onEntrySaved }: EntryFormProps) {
  const [isSaving,      setIsSaving]      = useState(false);
  // Persists across form resets so operator doesn't have to re-select chart each entry
  const [stickyChartNo, setStickyChartNo] = useState<EntryFormValues["chart_no"]>("" as EntryFormValues["chart_no"]);

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
      shed1: "",
      shed2: "",
      train_no: "",
      station: "",
      chart_no: "" as EntryFormValues["chart_no"],
      sno: 0,   // sentinel: 0 fails min(1), acts as "not selected"
      date: nowISO(),
      shutdown: false,
    },
  });

  // Keep session_id in sync; date is set by the user via datetime-local
  useEffect(() => {
    setValue("session_id", sessionId);
  }, [sessionId, setValue]);

  // Load from localStorage after mount to avoid SSR/client hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem("rco_active_chart");
    if (saved) {
      setStickyChartNo(saved as EntryFormValues["chart_no"]);
      setValue("chart_no", saved as EntryFormValues["chart_no"], { shouldValidate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep chart_no in sync with the sticky selector
  useEffect(() => {
    if (stickyChartNo) setValue("chart_no", stickyChartNo, { shouldValidate: false });
  }, [stickyChartNo, setValue]);

  function setChart(v: EntryFormValues["chart_no"]) {
    setStickyChartNo(v);
    setValue("chart_no", v, { shouldValidate: true });
    if (v) localStorage.setItem("rco_active_chart", v);
    else localStorage.removeItem("rco_active_chart");
  }

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
          shed1:      values.shed1?.trim().toUpperCase() || null,
          shed2:      values.shed2?.trim().toUpperCase() || null,
          train_no:   values.train_no.trim(),
          station:    values.station.trim(),
          chart_no:   values.chart_no,
          sno:        values.sno,
          date:       values.date,
          shutdown:   values.shutdown,
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
      // Keep chart_no sticky — operator usually enters multiple entries for same chart
      reset({
        session_id: sessionId,
        loco1: "",
        loco2: "",
        shed1: "",
        shed2: "",
        train_no: "",
        station: "",
        chart_no: stickyChartNo,
        sno: 0,
        date: nowISO(),
        shutdown: false,
      });
      // Return focus to loco1 so the operator can immediately key in the next entry
      setTimeout(() => (document.getElementById("loco1") as HTMLInputElement | null)?.focus(), 30);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    }
    setIsSaving(false);
  }

  // Called when user taps an SNO option — setValue updates RHF's internal ref
  // synchronously, so handleSubmit sees the new value immediately.
  function handleSnoSelect(value: Sno) {
    setValue("sno", value, { shouldValidate: true });
    handleSubmit(attemptSave)();
  }

  // ─── shared class helpers ──────────────────────────────────────────────────
  const inputCls =
    "w-full border border-neutral-300 bg-white px-3 py-2.5 md:py-2 md:text-sm text-base text-black font-mono " +
    "placeholder:text-neutral-300 focus:outline-none focus:border-black transition-colors rounded-none";

  const labelCls =
    "block text-[10px] font-bold text-neutral-600 uppercase tracking-[0.15em] mb-1.5";

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
      {/* ── Sticky Chart No selector ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-3 p-3 bg-neutral-50 border border-neutral-200 overflow-hidden">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500 shrink-0">
          Active Chart
        </span>
        <select
          value={stickyChartNo}
          onChange={(e) => setChart(e.target.value as EntryFormValues["chart_no"])}
          className="min-w-0 flex-1 border border-neutral-300 bg-white px-2 py-1.5 text-sm font-mono
                     text-black focus:outline-none focus:border-black transition-colors rounded-none"
        >
          <option value="">— select chart —</option>
          {CHART_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {stickyChartNo && (
          <span className="text-[10px] font-mono text-emerald-600 border border-emerald-300 px-1.5 py-0.5 shrink-0">
            Chart {stickyChartNo}
          </span>
        )}
      </div>

      {/* ── Entry form ────────────────────────────────────────────────────── */}
      <form
        onSubmit={(e) => e.preventDefault()}
        className="bg-white border border-neutral-200 p-6 space-y-6"
        noValidate
      >
      {/* ── Row 1: Loco 1 + Loco 2 (each with their shed below) ─────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-3">
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
          {/* <div>
            <label htmlFor="shed1" className={labelCls}>
              Shed 1{" "}
              <span className="text-neutral-300 normal-case tracking-normal text-[9px]">optional</span>
            </label>
            <input
              id="shed1"
              type="text"
              {...register("shed1")}
              className={cn(inputCls, "uppercase")}
              placeholder="e.g. LKO"
            />
          </div> */}
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="loco2" className={labelCls}>
              Loco 2{" "}
              <span className="text-neutral-300 normal-case tracking-normal text-[9px]">optional</span>
            </label>
            <input
              id="loco2"
              inputMode="numeric"
              {...register("loco2")}
              className={inputCls}
              placeholder="e.g. 67890"
            />
          </div>
          {/* <div>
            <label htmlFor="shed2" className={labelCls}>
              Shed 2{" "}
              <span className="text-neutral-300 normal-case tracking-normal text-[9px]">optional</span>
            </label>
            <input
              id="shed2"
              type="text"
              {...register("shed2")}
              className={cn(inputCls, "uppercase")}
              placeholder="e.g. GZB"
            />
          </div> */}
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

      {/* ── Chart No hidden — driven by sticky selector above ────────────── */}
      {errors.chart_no && (
        <p className="-mt-4 text-[11px] text-red-600">
          {errors.chart_no.message as string} — select a chart above
        </p>
      )}
      {/* ── Shutdown ──────────────────────────────────────────── */}
      <div>
        <Controller
          control={control}
          name="shutdown"
          render={({ field }) => (
            <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
              <button
                type="button"
                role="checkbox"
                aria-checked={field.value}
                onClick={() => field.onChange(!field.value)}
                className={cn(
                  "h-5 w-5 border-2 flex items-center justify-center transition-colors rounded-none flex-shrink-0",
                  field.value
                    ? "bg-black border-black"
                    : "bg-white border-neutral-300 hover:border-black"
                )}
              >
                {field.value && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <span className="text-xs font-mono text-black">
                Shutdown
              </span>
              {field.value && (
                <span className="text-[10px] uppercase tracking-wider text-red-600 border border-red-300 px-1.5 py-0.5 font-medium">
                  YES
                </span>
              )}
            </label>
          )}
        />
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
  </>
  );
}
