export function EntriesSectionLoading() {
  return (
    <div className="border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-neutral-300 animate-pulse" />
        <span className="h-2 w-2 rounded-full bg-neutral-300 animate-pulse [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-neutral-300 animate-pulse [animation-delay:300ms]" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((__, j) => (
              <div key={j} className="h-3 bg-neutral-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}