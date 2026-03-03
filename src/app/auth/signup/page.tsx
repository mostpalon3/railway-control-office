"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupSchema, type SignupFormValues } from "@/lib/validations";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
  });

  async function onSubmit(values: SignupFormValues) {
    try {
      const credential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[signup session POST failed]", body);
        toast.error(`Session error: ${body?.error ?? "unknown — check terminal logs"}`);
        return;
      }

      toast.success("Account created — you are now signed in.");
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      console.error("[signup error]", err);
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-already-in-use") {
        toast.error("An account with this email already exists.");
      } else if (code === "auth/operation-not-allowed") {
        toast.error("Email/password sign-up is not enabled. Enable it in Firebase console → Authentication → Sign-in method.");
      } else if (code === "auth/weak-password") {
        toast.error("Password is too weak.");
      } else if (code === "auth/unverified-email") {
        toast.error("Email verification is enforced on your Firebase project. Go to Firebase console → Authentication → Settings → disable \"Require email verification\".");
      } else {
        toast.error(err instanceof Error ? err.message : "Sign-up failed");
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
            Create account
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
              autoComplete="new-password"
              {...register("password")}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-black
                         placeholder:text-neutral-300 focus:outline-none focus:border-black
                         transition-colors rounded-none"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
            />
            {errors.password && (
              <p className="mt-1 text-[11px] text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-[10px] font-medium text-neutral-500 uppercase tracking-[0.15em] mb-1.5"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              className="w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-black
                         placeholder:text-neutral-300 focus:outline-none focus:border-black
                         transition-colors rounded-none"
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-[11px] text-red-600">
                {errors.confirmPassword.message}
              </p>
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
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-xs text-neutral-400 text-center">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-black underline underline-offset-2 hover:text-neutral-600 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

