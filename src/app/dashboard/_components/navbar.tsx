"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { toast } from "sonner";

interface NavbarProps {
  email: string | undefined;
}

export function Navbar({ email }: NavbarProps) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await signOut(auth);
      await fetch("/api/auth/session", { method: "DELETE" });
      router.push("/auth/login");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Logout failed";
      toast.error(msg);
    }
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="max-w-7xl mx-auto px-6 h-12 flex items-center justify-between">
        {/* Left: App title */}
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 select-none">
          Railway Control Office
        </span>

        {/* Right: User info + logout */}
        <div className="flex items-center gap-4">
          {email && (
            <span className="font-mono text-[10px] text-neutral-400 hidden sm:block">
              {email}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-[10px] uppercase tracking-[0.15em] text-neutral-500
                       border border-neutral-300 px-3 py-1.5 hover:border-black
                       hover:text-black transition-colors rounded-none bg-white"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
