"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormValues } from "@/lib/validations";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const credential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[session POST failed]", body);
        toast.error("Session creation failed — check server logs.");
        return;
      }

      toast.success("Signed in successfully");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      console.error("[signIn error]", err);
      // Map Firebase error codes to readable messages
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
        toast.error("Incorrect email or password.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many failed attempts — try again later.");
      } else if (code === "auth/operation-not-allowed") {
        toast.error("Email/password sign-in is not enabled. Enable it in Firebase console → Authentication → Sign-in method.");
      } else if (code === "auth/user-disabled") {
        toast.error("This account has been disabled.");
      } else if (code === "auth/unverified-email" || (err instanceof Error && err.message.toLowerCase().includes("email"))) {
        toast.error("Email verification is enforced on your Firebase project. Go to Firebase console → Authentication → Settings → disable \"Require email verification\".");
      } else {
        toast.error(err instanceof Error ? err.message : "Sign-in failed");
      }
    }
  }

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm border border-neutral-200 bg-white p-8">
        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.2em] mb-2">
            Railway Control Office
          </p>
          <h1 className="text-xl font-semibold text-black tracking-tight">
            Sign in
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-[10px] font-medium text-neutral-500 uppercase tracking-[0.15em] mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-black
                         placeholder:text-neutral-300 focus:outline-none focus:border-black
                         transition-colors rounded-none"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-[11px] text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-[10px] font-medium text-neutral-500 uppercase tracking-[0.15em] mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-black
                         placeholder:text-neutral-300 focus:outline-none focus:border-black
                         transition-colors rounded-none"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-[11px] text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-black text-white text-sm font-medium py-2.5 mt-2
                       hover:bg-neutral-800 active:bg-neutral-900
                       transition-colors rounded-none
                       disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-xs text-neutral-400 text-center">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="text-black underline underline-offset-2 hover:text-neutral-600 transition-colors"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
