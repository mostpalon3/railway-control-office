import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/firebase/server";
import { isAdminEmail } from "@/lib/is-admin";
import { getAllowedEmails, addAllowedEmail } from "@/lib/allowlist";
import { getRedis, KEYS } from "@/lib/redis";
import { memDel } from "@/lib/mem-cache";

/**
 * GET /api/admin/allowlist
 * Returns all emails in the signup allowlist. Admin-only.
 */
export async function GET() {
  try {
    const caller = await getCachedUser();
    if (!caller || !isAdminEmail(caller.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const emails = await getAllowedEmails();
    return NextResponse.json({ emails });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/allowlist]", message);
    return NextResponse.json({ error: "Failed to fetch allowlist." }, { status: 500 });
  }
}

/**
 * POST /api/admin/allowlist
 * Body: { email }
 * Adds an email to the signup allowlist. Admin-only.
 */
export async function POST(req: NextRequest) {
  try {
    const caller = await getCachedUser();
    if (!caller || !isAdminEmail(caller.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { email } = body as { email?: string };

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    await addAllowedEmail(email);
    // Bust cached allowlist so admin page reflects the change immediately
    memDel(KEYS.adminAllowlist);
    getRedis()?.del(KEYS.adminAllowlist).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/admin/allowlist]", message);
    return NextResponse.json({ error: "Failed to add email." }, { status: 500 });
  }
}
