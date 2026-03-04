import Link from "next/link";
import { FileSearch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md w-full space-y-8">

        <div className="space-y-3">
          <FileSearch size={28} className="text-neutral-300" />
          <div className="space-y-1">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
              404
            </p>
            <h1 className="text-xl font-semibold text-black tracking-tight">
              Page not found
            </h1>
            <p className="text-sm text-neutral-500">
              The page you're looking for doesn't exist or may have been moved.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="flex items-center justify-center px-5 h-9 border border-black
                       bg-black text-white text-[11px] font-mono uppercase tracking-wider
                       hover:bg-neutral-800 transition-colors rounded-none"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center px-5 h-9 border border-neutral-300
                       text-neutral-600 text-[11px] font-mono uppercase tracking-wider
                       hover:border-black hover:text-black transition-colors rounded-none"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
