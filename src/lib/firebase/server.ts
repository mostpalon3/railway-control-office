import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

/**
 * Reads the __session httpOnly cookie and verifies it with Firebase Admin.
 * Returns the decoded token (with uid, email, etc.) or null.
 *
 * Use this in server components and API routes instead of the Supabase
 * `createClient` + `auth.getUser()` pattern.
 */
export async function getServerUser() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("__session")?.value;
    if (!session) return null;
    const decoded = await adminAuth.verifySessionCookie(session, false);
    return decoded; // { uid, email, ... }
  } catch {
    return null;
  }
}
