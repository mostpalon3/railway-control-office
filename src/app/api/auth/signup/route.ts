import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { isEmailAllowed, seedAllowlistIfEmpty } from "@/lib/allowlist";

const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000; // 14 days

/**
 * POST /api/auth/signup
 * Body: { email, password }
 *
 * 1. Checks the email against the allowed_emails MongoDB collection.
 * 2. Creates the Firebase user via Admin SDK.
 * 3. Signs in via the Firebase Identity Toolkit REST API to get an idToken.
 * 4. Issues a session cookie — same as the normal login flow.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 }
      );
    }

    // ── 1. Seed allowlist on first run, then check ─────────────────────────
    await seedAllowlistIfEmpty();
    const allowed = await isEmailAllowed(email);
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "This email is not authorised to sign up. Contact an admin to request access.",
        },
        { status: 403 }
      );
    }

    // ── 2. Create the Firebase user (server-side via Admin SDK) ────────────
    await adminAuth.createUser({ email, password });

    // ── 3. Sign in via REST API to obtain an idToken ───────────────────────
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const signInData = await signInRes.json();
    if (!signInRes.ok) {
      // Clean up the created user if we can't sign in
      try {
        const user = await adminAuth.getUserByEmail(email);
        await adminAuth.deleteUser(user.uid);
      } catch {
        // best-effort cleanup
      }
      throw new Error(signInData.error?.message ?? "Failed to sign in after account creation.");
    }

    // ── 4. Create session cookie ───────────────────────────────────────────
    const sessionCookie = await adminAuth.createSessionCookie(signInData.idToken, {
      expiresIn: SESSION_DURATION_MS,
    });

    const res = NextResponse.json({ ok: true });
    res.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_MS / 1000,
      path: "/",
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/auth/signup]", message);

    if (message.includes("EMAIL_EXISTS") || message.includes("email-already-exists")) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    if (message.includes("WEAK_PASSWORD") || message.includes("weak-password")) {
      return NextResponse.json(
        { error: "Password is too weak. Use at least 8 characters with uppercase and a number." },
        { status: 400 }
      );
    }
    if (message.includes("INVALID_EMAIL") || message.includes("invalid-email")) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    return NextResponse.json({ error: "Sign-up failed. Please try again." }, { status: 500 });
  }
}

