import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/firebase/server";
import { isAdminEmail } from "@/lib/is-admin";
import { adminAuth } from "@/lib/firebase/admin";
import { getAllowedEmails, seedAllowlistIfEmpty } from "@/lib/allowlist";
import { getRedis, KEYS } from "@/lib/redis";
import { memGet, memSet } from "@/lib/mem-cache";
import { Navbar } from "../_components/navbar";
import { AdminPanel } from "./_components/admin-panel";

type AdminUser = { uid: string; email: string; disabled: boolean; createdAt: string };
const ADMIN_TTL_MS = 60_000; // 60 s mem
const ADMIN_TTL_S  = 60;     // 60 s Redis

export default async function AdminPage() {
  const user = await getServerUser();
  if (!user) redirect("/auth/login");
  if (!isAdminEmail(user.email)) redirect("/dashboard");

  // Seed on first visit so the collection always exists (fast no-op after first run)
  await seedAllowlistIfEmpty();

  const redis = getRedis();

  // ── Firebase users — 3-layer cache ──────────────────────────────────────
  let users: AdminUser[] = [];
  try {
    const memUsers = memGet<AdminUser[]>(KEYS.adminUsers);
    if (memUsers) {
      users = memUsers;
    } else {
      const redisUsers = redis ? await redis.get<AdminUser[]>(KEYS.adminUsers) : null;
      if (redisUsers) {
        users = redisUsers;
        memSet(KEYS.adminUsers, redisUsers, ADMIN_TTL_MS);
      } else {
        const listResult = await adminAuth.listUsers();
        users = listResult.users.map((u) => ({
          uid:       u.uid,
          email:     u.email ?? "(no email)",
          disabled:  u.disabled,
          createdAt: u.metadata.creationTime ?? "",
        }));
        users.sort((a, b) => {
          if (a.disabled !== b.disabled) return a.disabled ? 1 : -1;
          return a.email.localeCompare(b.email);
        });
        memSet(KEYS.adminUsers, users, ADMIN_TTL_MS);
        redis?.set(KEYS.adminUsers, users, { ex: ADMIN_TTL_S }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[admin page] listUsers failed:", err);
  }

  // ── Allowlist — 3-layer cache ────────────────────────────────────────────
  let allowedEmails: string[] = [];
  try {
    const memList = memGet<string[]>(KEYS.adminAllowlist);
    if (memList) {
      allowedEmails = memList;
    } else {
      const redisList = redis ? await redis.get<string[]>(KEYS.adminAllowlist) : null;
      if (redisList) {
        allowedEmails = redisList;
        memSet(KEYS.adminAllowlist, redisList, ADMIN_TTL_MS);
      } else {
        allowedEmails = await getAllowedEmails();
        memSet(KEYS.adminAllowlist, allowedEmails, ADMIN_TTL_MS);
        redis?.set(KEYS.adminAllowlist, allowedEmails, { ex: ADMIN_TTL_S }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("[admin page] getAllowedEmails failed:", err);
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar email={user.email} isAdmin={true} />
      <main className="max-w-4xl mx-auto px-6 py-10">
        <AdminPanel
          initialUsers={users}
          initialAllowlist={allowedEmails}
          currentUserEmail={user.email ?? ""}
        />
      </main>
    </div>
  );
}
