import { NextRequest, NextResponse } from "next/server";
import { getCachedUser } from "@/lib/firebase/server";
import { isAdminEmail } from "@/lib/is-admin";
import { removeAllowedEmail } from "@/lib/allowlist";
import { getRedis, KEYS } from "@/lib/redis";
import { memDel } from "@/lib/mem-cache";

/**
 * DELETE /api/admin/allowlist/[email]
 * Removes an email from the signup allowlist. Admin-only.
 * The email param must be URL-encoded.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  try {
    const caller = await getCachedUser();
    if (!caller || !isAdminEmail(caller.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email } = await params;
    const decoded = decodeURIComponent(email);
    await removeAllowedEmail(decoded);
    // Bust cached allowlist so admin page reflects the change immediately
    memDel(KEYS.adminAllowlist);
    getRedis()?.del(KEYS.adminAllowlist).catch(() => {});
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/admin/allowlist/[email]]", message);
    return NextResponse.json({ error: "Failed to remove email." }, { status: 500 });
  }
}
