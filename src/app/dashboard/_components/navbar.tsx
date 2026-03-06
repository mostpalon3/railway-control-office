"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { toast } from "sonner";
import { Palette, Users } from "lucide-react";
import { useTheme, THEMES, THEME_LABELS } from "@/lib/ThemeContext";
import Link from "next/link";

interface NavbarProps {
  email: string | undefined;
  isAdmin?: boolean;
}

export function Navbar({ email, isAdmin }: NavbarProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

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
          {/* Admin badge + Users link */}
          {isAdmin && (
            <>
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5
                               bg-black text-white hidden sm:inline-block">
                Admin
              </span>
              <Link
                href="/dashboard/admin"
                className="h-7 w-7 flex items-center justify-center border border-neutral-300
                           text-neutral-500 hover:border-black hover:text-black transition-colors"
                title="Manage users"
              >
                <Users size={13} />
              </Link>
            </>
          )}

          {/* Theme cycle button */}
          <button
            type="button"
            onClick={() => {
              const idx = THEMES.indexOf(theme);
              setTheme(THEMES[(idx + 1) % THEMES.length]);
            }}
            title={THEME_LABELS[theme]}
            className="h-7 w-7 flex items-center justify-center border border-neutral-300
                       text-neutral-500 hover:border-black hover:text-black transition-colors"
          >
            <Palette size={13} />
          </button>
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
