import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { getCachedUser } from "@/lib/firebase/server";
import { isAdminEmail } from "@/lib/is-admin";

/**
 * GET /api/admin/users
 * Returns all Firebase Auth users. Admin-only.
 */
export async function GET() {
  try {
    const caller = await getCachedUser();
    if (!caller || !isAdminEmail(caller.email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const listResult = await adminAuth.listUsers();
    const users = listResult.users.map((u) => ({
      uid: u.uid,
      email: u.email ?? "",
      disabled: u.disabled,
      createdAt: u.metadata.creationTime ?? "",
    }));

    return NextResponse.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/admin/users]", message);
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
  }
}
