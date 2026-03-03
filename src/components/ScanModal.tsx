"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { X, Camera, Upload, Loader2, ScanText } from "lucide-react";
import { cn } from "@/lib/utils";
import { CHART_NO_VALUES } from "@/lib/validations";
import type { ChartNo, Sno } from "@/lib/supabase/types";

// ─── exported result type ─────────────────────────────────────────────────────
export interface ScanResult {
  loco1?: string;
  loco2?: string;
  train_no?: string;
  station?: string;
  chart_no?: ChartNo;
  sno?: Sno;
}

type ScanStep = "choose" | "camera" | "scanning" | "result";

interface ScanModalProps {
  onClose: () => void;
  onApply: (result: ScanResult) => void;
}

// ─── OCR text parser ──────────────────────────────────────────────────────────
// Tries labeled patterns first, then falls back to positional heuristics.
function parseOcrText(text: string): ScanResult {
  const result: ScanResult = {};
  const upper = text.toUpperCase().replace(/[|[\]{}]/g, "").replace(/\s+/g, " ");

  // ── labeled matches ──────────────────────────────────────────────────────
  const locoAll = [...upper.matchAll(/LOCO\s*[12]?\s*[:\-#]?\s*(\d{4,6})/g)];
  if (locoAll[0]) result.loco1 = locoAll[0][1];
  if (locoAll[1]) result.loco2 = locoAll[1][1];

  const trainMatch = upper.match(/TRAIN\s*(?:NO|NUMBER|#)?\s*[:\-]?\s*(\d{4,5})/);
  if (trainMatch) result.train_no = trainMatch[1];

  const stationMatch = upper.match(/STATION\s*[:\-]?\s*([A-Z]{2,6})/);
  if (stationMatch) result.station = stationMatch[1];

  const chartMatch = upper.match(/CHART\s*(?:NO|NUMBER|#)?\s*[:\-]?\s*(3A|\d{1,2})/);
  if (chartMatch) {
    const val = chartMatch[1] as ChartNo;
    if ((CHART_NO_VALUES as readonly string[]).includes(val)) result.chart_no = val;
  }

  const snoMatch = upper.match(/(?:S\.?\s*?NO|SNO|SERIAL\s*NO)\s*[:\-]?\s*(\d{1,2})/);
  if (snoMatch) {
    const n = parseInt(snoMatch[1], 10);
    if (n >= 1 && n <= 21) result.sno = n as Sno;
  }

  // ── fallback: extract all 5-digit numbers ────────────────────────────────
  if (!result.loco1) {
    const fiveDigit = [...text.matchAll(/\b(\d{5})\b/g)].map((m) => m[1]);
    if (fiveDigit[0]) result.loco1 = fiveDigit[0];
    if (fiveDigit[1] && fiveDigit[1] !== fiveDigit[0]) result.loco2 = fiveDigit[1];
    if (fiveDigit[2] && !result.train_no) result.train_no = fiveDigit[2];
  }

  // ── fallback: 3–5 uppercase letter word for station ──────────────────────
  if (!result.station) {
    const words = upper.split(/\s+/);
    const guess = words.find(
      (w) => /^[A-Z]{3,5}$/.test(w) && !["LOCO", "TRAIN", "CHART", "STATION"].includes(w)
    );
    if (guess) result.station = guess;
  }

  // ── fallback: chart_no from standalone 1–12 or 3A ───────────────────────
  if (!result.chart_no) {
    const chartFallback = upper.match(/\b(3A|1[012]|[1-9])\b/);
    if (chartFallback) {
      const val = chartFallback[1] as ChartNo;
      if ((CHART_NO_VALUES as readonly string[]).includes(val)) result.chart_no = val;
    }
  }

  return result;
}

// ─── confidence badge ─────────────────────────────────────────────────────────
function ConfBadge({ detected }: { detected: boolean }) {
  return (
    <span
      className={cn(
        "text-[8px] uppercase tracking-wider font-medium ml-1.5",
        detected ? "text-emerald-600" : "text-neutral-400"
      )}
    >
      {detected ? "detected" : "not found"}
    </span>
  );
}

// ─── component ───────────────────────────────────────────────────────────────
export function ScanModal({ onClose, onApply }: ScanModalProps) {
  const [step, setStep] = useState<ScanStep>("choose");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [result, setResult] = useState<ScanResult>({});
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState("Initialising OCR engine…");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── cleanup camera on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => stopStream();
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // ── start camera ──────────────────────────────────────────────────────────
  async function startCamera() {
    setCameraError(null);
    setStep("camera");
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Camera access denied or unavailable."
      );
    }
  }

  // Attach stream when the video element mounts in the camera step
  useEffect(() => {
    if (step === "camera" && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [step]);

  // ── capture still from video ──────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const url = canvas.toDataURL("image/jpeg", 0.92);
    stopStream();
    setImageUrl(url);
    runOcr(url);
  }, []);

  // ── file upload ───────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setImageUrl(url);
      runOcr(url);
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    e.target.value = "";
  }

  // ── run Tesseract OCR (dynamic import — never bundled upfront) ────────────
  async function runOcr(imgUrl: string) {
    setStep("scanning");
    setScanProgress(0);
    setScanStatus("Loading OCR engine…");

    try {
      const { createWorker } = await import("tesseract.js");

      // v6/v7 createWorker signature: (lang, oem?, options?)
      const worker = await createWorker("eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setScanProgress(Math.round(m.progress * 100));
            setScanStatus(`Recognising text… ${Math.round(m.progress * 100)}%`);
          } else if (m.status === "loading tesseract core") {
            setScanStatus("Loading Tesseract core…");
          } else if (m.status === "initializing api") {
            setScanStatus("Initialising OCR engine…");
          } else if (m.status === "loading language traineddata") {
            setScanStatus("Loading language data…");
          }
        },
      });

      const { data } = await worker.recognize(imgUrl);
      await worker.terminate();

      setOcrText(data.text ?? "");
      setResult(parseOcrText(data.text ?? ""));
    } catch (err) {
      console.error("OCR error:", err);
      setOcrText("");
      setResult({});
    } finally {
      setStep("result");
    }
  }

  // ── edit a result field ───────────────────────────────────────────────────
  function updateField(field: keyof ScanResult, value: string) {
    setResult((prev) => ({ ...prev, [field]: value || undefined }));
  }

  // ── reset to choose step ──────────────────────────────────────────────────
  function rescan() {
    stopStream();
    setStep("choose");
    setImageUrl(null);
    setOcrText("");
    setResult({});
    setScanProgress(0);
  }

  // ── handle backdrop click ─────────────────────────────────────────────────
  function handleBackdrop() {
    stopStream();
    onClose();
  }

  // ── shared styles ─────────────────────────────────────────────────────────
  const fieldCls =
    "w-full border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-mono " +
    "text-black placeholder:text-neutral-300 focus:outline-none focus:border-black " +
    "transition-colors rounded-none";

  const labelCls =
    "block text-[8px] font-medium text-neutral-500 uppercase tracking-[0.15em] mb-1 select-none";

  const squareBtnBase =
    "h-9 border text-[10px] font-mono uppercase tracking-wider transition-colors rounded-none";

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div
        className="bg-white w-full max-w-md border border-neutral-200 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-2">
            <ScanText size={13} className="text-neutral-500" />
            <h2 className="text-[10px] font-medium uppercase tracking-[0.15em] text-black">
              Scan Document
            </h2>
          </div>
          <button
            onClick={handleBackdrop}
            className="p-1.5 text-neutral-400 hover:text-black transition-colors"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Body (scrollable) ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ════ STEP: choose ════════════════════════════════════════════ */}
          {step === "choose" && (
            <div className="space-y-4">
              <p className="text-[10px] font-mono text-neutral-500">
                Take a photo of the working chart or upload an image.
                Tesseract OCR will extract loco, train, station and chart details.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-3 py-7 border border-neutral-300
                             hover:border-black transition-colors group"
                >
                  <Upload
                    size={22}
                    className="text-neutral-400 group-hover:text-black transition-colors"
                  />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-600 group-hover:text-black">
                    Upload Image
                  </span>
                </button>
                {/* Camera */}
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center gap-3 py-7 border border-neutral-300
                             hover:border-black transition-colors group"
                >
                  <Camera
                    size={22}
                    className="text-neutral-400 group-hover:text-black transition-colors"
                  />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-600 group-hover:text-black">
                    Use Camera
                  </span>
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* ════ STEP: camera ════════════════════════════════════════════ */}
          {step === "camera" && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="border border-red-200 bg-red-50 p-4">
                  <p className="text-xs font-mono text-red-700">{cameraError}</p>
                  <p className="text-[10px] text-red-500 mt-1">
                    Try uploading an image instead.
                  </p>
                </div>
              ) : (
                <div className="relative bg-neutral-900 overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Framing guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-4/5 h-3/4 border border-dashed border-white/40 relative">
                      {/* Corner ticks */}
                      {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map(
                        (pos, i) => (
                          <span
                            key={i}
                            className={`absolute ${pos} w-3 h-3 border-white`}
                            style={{
                              borderTopWidth: pos.includes("top") ? 2 : 0,
                              borderBottomWidth: pos.includes("bottom") ? 2 : 0,
                              borderLeftWidth: pos.includes("left") ? 2 : 0,
                              borderRightWidth: pos.includes("right") ? 2 : 0,
                            }}
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex gap-2">
                <button
                  onClick={() => { stopStream(); setStep("choose"); }}
                  className={cn(squareBtnBase, "flex-1 border-neutral-300 text-neutral-600 hover:border-black hover:text-black")}
                >
                  Back
                </button>
                {!cameraError && (
                  <button
                    onClick={capturePhoto}
                    className={cn(squareBtnBase, "flex-1 border-black bg-black text-white hover:bg-neutral-800")}
                  >
                    Capture
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ════ STEP: scanning ══════════════════════════════════════════ */}
          {step === "scanning" && (
            <div className="space-y-4">
              {/* Image preview while scanning */}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Scanned document preview"
                  className="w-full max-h-44 object-contain border border-neutral-200"
                />
              )}
              {/* Progress */}
              <div className="flex items-start gap-3 pt-1">
                <Loader2 size={14} className="animate-spin text-neutral-500 mt-0.5 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-1 bg-neutral-100">
                    <div
                      className="h-1 bg-black transition-[width] duration-300"
                      style={{ width: `${Math.max(scanProgress, 3)}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-mono text-neutral-500">{scanStatus}</p>
                </div>
              </div>
              <p className="text-[9px] font-mono text-neutral-400">
                The first scan downloads language data (~4 MB). Subsequent scans are faster.
              </p>
            </div>
          )}

          {/* ════ STEP: result ════════════════════════════════════════════ */}
          {step === "result" && (
            <div className="space-y-4">
              {/* Thumbnail */}
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Scanned document"
                  className="w-full max-h-32 object-contain border border-neutral-200"
                />
              )}

              {/* Extracted fields */}
              <div>
                <p className="text-[8px] uppercase tracking-[0.15em] font-medium text-neutral-400 mb-3">
                  Extracted values — edit if needed, then click Apply
                </p>

                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  {/* Loco 1 */}
                  <div>
                    <label className={labelCls}>
                      Loco 1<ConfBadge detected={!!result.loco1} />
                    </label>
                    <input
                      className={fieldCls}
                      value={result.loco1 ?? ""}
                      onChange={(e) => updateField("loco1", e.target.value)}
                      placeholder="e.g. 12345"
                      inputMode="numeric"
                    />
                  </div>

                  {/* Loco 2 */}
                  <div>
                    <label className={labelCls}>
                      Loco 2<ConfBadge detected={!!result.loco2} />
                    </label>
                    <input
                      className={fieldCls}
                      value={result.loco2 ?? ""}
                      onChange={(e) => updateField("loco2", e.target.value)}
                      placeholder="Optional"
                      inputMode="numeric"
                    />
                  </div>

                  {/* Train No */}
                  <div>
                    <label className={labelCls}>
                      Train No<ConfBadge detected={!!result.train_no} />
                    </label>
                    <input
                      className={fieldCls}
                      value={result.train_no ?? ""}
                      onChange={(e) => updateField("train_no", e.target.value)}
                      placeholder="e.g. 12301"
                      inputMode="numeric"
                    />
                  </div>

                  {/* Station */}
                  <div>
                    <label className={labelCls}>
                      Station<ConfBadge detected={!!result.station} />
                    </label>
                    <input
                      className={fieldCls}
                      value={result.station ?? ""}
                      onChange={(e) => updateField("station", e.target.value)}
                      placeholder="e.g. NDLS"
                    />
                  </div>

                  {/* Chart No */}
                  <div>
                    <label className={labelCls}>
                      Chart No<ConfBadge detected={!!result.chart_no} />
                    </label>
                    <select
                      className={fieldCls}
                      value={result.chart_no ?? ""}
                      onChange={(e) => {
                        const v = e.target.value as ChartNo;
                        setResult((prev) => ({ ...prev, chart_no: v || undefined }));
                      }}
                    >
                      <option value="">— select —</option>
                      {CHART_NO_VALUES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* S.No */}
                  <div>
                    <label className={labelCls}>
                      S. No<ConfBadge detected={!!result.sno} />
                    </label>
                    <select
                      className={fieldCls}
                      value={result.sno ?? ""}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        setResult((prev) => ({
                          ...prev,
                          sno: n ? (n as Sno) : undefined,
                        }));
                      }}
                    >
                      <option value="">— select —</option>
                      {Array.from({ length: 21 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Raw OCR text — collapsible */}
              {ocrText && (
                <details>
                  <summary className="cursor-pointer text-[8px] uppercase tracking-[0.15em] text-neutral-400 font-medium select-none py-1">
                    Raw OCR output ▾
                  </summary>
                  <pre className="mt-2 text-[9px] font-mono text-neutral-500 bg-neutral-50 border border-neutral-200 p-3 overflow-auto max-h-28 whitespace-pre-wrap break-words">
                    {ocrText}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>

        {/* ── Footer (only on result step) ──────────────────────────────── */}
        {step === "result" && (
          <div className="flex gap-2 px-5 py-4 border-t border-neutral-200 shrink-0">
            <button
              onClick={rescan}
              className={cn(squareBtnBase, "flex-1 border-neutral-300 text-neutral-600 hover:border-black hover:text-black")}
            >
              Rescan
            </button>
            <button
              onClick={() => { onApply(result); onClose(); }}
              className={cn(squareBtnBase, "flex-1 border-black bg-black text-white hover:bg-neutral-800")}
            >
              Apply to Form
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
