import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getCachedUser } from "@/lib/firebase/server";
import { isAdminEmail } from "@/lib/is-admin";
import { getRedis, KEYS } from "@/lib/redis";
import { memDel } from "@/lib/mem-cache";

function bustAdminUsersCache() {
  memDel(KEYS.adminUsers);
  getRedis()?.del(KEYS.adminUsers).catch(() => {});
}

/**
 * PATCH /api/admin/users/[uid]
 * Body: { action: "revoke" | "enable" }
 * Admin-only. Revoke disables the account and revokes all refresh tokens.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const caller = await getCachedUser();
    if (!caller || !isAdminEmail(caller.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { uid } = await params;
    const body = await req.json().catch(() => ({}));
    const { action } = body as { action?: string };

    if (action === "revoke") {
      await adminAuth.updateUser(uid, { disabled: true });
      await adminAuth.revokeRefreshTokens(uid);
      bustAdminUsersCache();
      return NextResponse.json({ ok: true });
    }

    if (action === "enable") {
      await adminAuth.updateUser(uid, { disabled: false });
      bustAdminUsersCache();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'revoke' or 'enable'." },
      { status: 400 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/admin/users/[uid]]", message);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[uid]
 * Permanently deletes a Firebase account. Admin-only.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const caller = await getCachedUser();
    if (!caller || !isAdminEmail(caller.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { uid } = await params;
    await adminAuth.deleteUser(uid);
    bustAdminUsersCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/admin/users/[uid]]", message);
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
}
