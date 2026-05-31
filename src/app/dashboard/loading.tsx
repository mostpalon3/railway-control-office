export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 h-12" />
      </div>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-neutral-300 animate-pulse [animation-delay:0ms]" />
              <span className="h-2 w-2 rounded-full bg-neutral-300 animate-pulse [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-neutral-300 animate-pulse [animation-delay:300ms]" />
            </div>
            <div className="h-6 w-24 bg-neutral-100" />
            <div className="h-8 w-64 bg-neutral-100" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="border border-neutral-100 p-5 h-40 bg-neutral-50/50">
                <div className="flex items-center gap-2 mb-4">
                  <span className="h-2 w-2 rounded-full bg-neutral-200 animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-neutral-200 animate-pulse [animation-delay:150ms]" />
                  <span className="h-2 w-2 rounded-full bg-neutral-200 animate-pulse [animation-delay:300ms]" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-3/5 bg-neutral-100" />
                  <div className="h-4 w-4/5 bg-neutral-100" />
                  <div className="h-4 w-2/5 bg-neutral-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}