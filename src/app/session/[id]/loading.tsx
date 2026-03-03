// Suspense-boundary skeleton — shown while the session layout server-fetches data.
export default function SessionLoading() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      {/* Header bar */}
      <div className="border-b border-neutral-200 h-12 px-6 flex items-center gap-3">
        <div className="h-3.5 w-28 bg-neutral-100" />
        <div className="h-4 w-10 bg-neutral-200/60 border border-neutral-200" />
        <div className="ml-auto flex gap-2">
          <div className="h-7 w-20 bg-neutral-100" />
          <div className="h-7 w-24 bg-neutral-100" />
          <div className="h-7 w-24 bg-neutral-200" />
        </div>
      </div>

      {/* Tab nav */}
      <div className="border-b border-neutral-200 px-6">
        <div className="flex gap-0 pt-0.5">
          {[80, 72, 64].map((w, i) => (
            <div key={i} className="px-5 py-3">
              <div className="h-2.5 bg-neutral-100" style={{ width: w }} />
            </div>
          ))}
        </div>
        <div className="pb-3">
          <div className="h-8 w-full bg-neutral-50 border border-neutral-200" />
        </div>
      </div>

      {/* Content */}
      <main className="px-6 py-6">
        <div className="flex flex-col xl:flex-row gap-6">
          {/* Table skeleton — left / top */}
          <div className="flex-1 min-w-0 order-last xl:order-first">
            {/* Group header */}
            <div className="border border-neutral-200 mb-6">
              <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 flex gap-2">
                <div className="h-2.5 w-10 bg-neutral-200" />
                <div className="h-2.5 w-16 bg-neutral-100" />
              </div>
              {/* Rows */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-7 gap-4 px-3 py-2.5 border-b border-neutral-100 last:border-0"
                >
                  <div className="h-2.5 bg-neutral-100" />
                  <div className="h-2.5 bg-neutral-100" />
                  <div className="h-2.5 bg-neutral-100 w-5" />
                  <div className="h-2.5 bg-neutral-100" />
                  <div className="h-2.5 bg-neutral-100" />
                  <div className="h-2.5 bg-neutral-100" />
                  <div className="h-2.5 bg-neutral-200" />
                </div>
              ))}
            </div>
            {/* Second group */}
            <div className="border border-neutral-200">
              <div className="px-4 py-2 bg-neutral-50 border-b border-neutral-200 flex gap-2">
                <div className="h-2.5 w-10 bg-neutral-200" />
                <div className="h-2.5 w-20 bg-neutral-100" />
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-7 gap-4 px-3 py-2.5 border-b border-neutral-100 last:border-0"
                >
                  {Array.from({ length: 7 }).map((_, j) => (
                    <div key={j} className="h-2.5 bg-neutral-100" />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Form skeleton — right / top on mobile */}
          <div className="w-full xl:w-80 shrink-0 order-first xl:order-last">
            <div className="h-9 w-full border border-neutral-300 mb-3" />
            <div className="border border-neutral-200 p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><div className="h-2 w-10 bg-neutral-200" /><div className="h-9 bg-neutral-100 border border-neutral-200" /></div>
                <div className="space-y-1.5"><div className="h-2 w-10 bg-neutral-200" /><div className="h-9 bg-neutral-100 border border-neutral-200" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><div className="h-2 w-14 bg-neutral-200" /><div className="h-9 bg-neutral-100 border border-neutral-200" /></div>
                <div className="space-y-1.5"><div className="h-2 w-12 bg-neutral-200" /><div className="h-9 bg-neutral-100 border border-neutral-200" /></div>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-14 bg-neutral-200" />
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 13 }).map((_, i) => (
                    <div key={i} className="h-9 w-9 bg-neutral-100 border border-neutral-200" />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-8 bg-neutral-200" />
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 21 }).map((_, i) => (
                    <div key={i} className="h-9 bg-neutral-100 border border-neutral-200" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
