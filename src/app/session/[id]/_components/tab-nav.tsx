"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, X, Plus } from "lucide-react";

interface TabNavProps {
  sessionId: string;
}

const TABS = [
  { label: "By Train No.", href: (id: string) => `/session/${id}/train` },
  { label: "By Station",   href: (id: string) => `/session/${id}/station` },
  { label: "By Chart",     href: (id: string) => `/session/${id}/chart` },
] as const;

export function TabNav({ sessionId }: TabNavProps) {
  const pathname    = usePathname();
  const params      = useSearchParams();
  const router      = useRouter();
  const q           = params.get("q") ?? "";
  const formOpen    = params.get("form") === "1";

  function toggleForm() {
    const next = new URLSearchParams(params.toString());
    if (formOpen) next.delete("form"); else next.set("form", "1");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function handleSearch(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("q", value); else next.delete("q");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="border-b border-neutral-200 bg-white">
      {/* ── Tab row ── */}
      <div className="px-6 flex items-end gap-0">
        {TABS.map(({ label, href }) => {
          const base   = href(sessionId);
          const tabParams = new URLSearchParams();
          if (q) tabParams.set("q", q);
          if (formOpen) tabParams.set("form", "1");
          const paramStr = tabParams.toString();
          const to     = paramStr ? `${base}?${paramStr}` : base;
          const active = pathname === base || pathname.startsWith(base + "/");
          return (
            <Link
              key={base}
              href={to}
              className={cn(
                "px-3 sm:px-5 py-3 text-[11px] uppercase tracking-[0.15em] font-medium transition-colors border-b-2",
                active
                  ? "border-black text-black"
                  : "border-transparent text-neutral-400 hover:text-black hover:border-neutral-300"
              )}
            >
              {label}
            </Link>
          );
        })}

        {/* Mobile-only: toggle entry form */}
        <button
          type="button"
          onClick={toggleForm}
          aria-label={formOpen ? "Close form" : "New entry"}
          className={cn(
            "ml-auto self-center xl:hidden h-8 w-8 flex items-center justify-center border transition-colors",
            formOpen
              ? "border-black bg-black text-white"
              : "border-neutral-300 text-neutral-600 hover:border-black hover:text-black"
          )}
        >
          {formOpen ? <X size={14} /> : <Plus size={14} />}
        </button>
      </div>

      {/* ── Search row ── */}
      <div className="px-6 pb-3">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
          />
          <input
            type="text"
            value={q}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search LOCO, train no, station, chart, S.No, date…"
            className="w-full border border-neutral-300 bg-white pl-8 pr-8 py-2 text-xs
                       font-mono text-black placeholder:text-neutral-300 focus:outline-none
                       focus:border-black transition-colors rounded-none"
          />
          {q && (
            <button
              onClick={() => handleSearch("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400
                         hover:text-black transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
