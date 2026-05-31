"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
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
      const { signOut } = await import("firebase/auth");
      const { auth } = await import("@/lib/firebase/client");
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
        {/* Left: Logo + app name */}
        <div className="flex items-center gap-2 select-none">
          <Image
            src="/assets/android-chrome-192x192.png"
            alt="RCO Logo"
            width={24}
            height={24}
            className="rounded-sm"
          />
          <div className="flex flex-col leading-none gap-0.5">
            <span className="font-mono text-[7px] uppercase tracking-[0.15em] text-neutral-400">Railway</span>
            <span className="font-mono text-[7px] uppercase tracking-[0.15em] text-neutral-400">Control</span>
            <span className="font-mono text-[7px] uppercase tracking-[0.15em] text-neutral-400">Office</span>
          </div>
        </div>

        {/* Right: User info + logout */}
        <div className="flex items-center gap-4">
          {/* Admin badge + Users link */}
          {isAdmin && (
            <>
              <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5
                               bg-black text-white">
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

          {/* User badge for non-admins */}
          {!isAdmin && (
            <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5
                             border border-neutral-300 text-neutral-400">
              User
            </span>
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
