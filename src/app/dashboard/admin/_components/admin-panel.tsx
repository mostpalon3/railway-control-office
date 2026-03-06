"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import Link from "next/link";

type FirebaseUser = {
  uid: string;
  email: string;
  disabled: boolean;
  createdAt: string;
};

type Props = {
  initialUsers: FirebaseUser[];
  initialAllowlist: string[];
  currentUserEmail: string;
};

export function AdminPanel({ initialUsers, initialAllowlist, currentUserEmail }: Props) {
  const [users, setUsers] = useState<FirebaseUser[]>(initialUsers);
  const [allowlist, setAllowlist] = useState<string[]>(initialAllowlist);

  // ── Revoke state ───────────────────────────────────────────────────────────
  const [revokeUid, setRevokeUid] = useState<string | null>(null);
  const [revokeCode, setRevokeCode] = useState("");
  const [revoking, setRevoking] = useState(false);

  // ── Delete state ───────────────────────────────────────────────────────────
  const [deleteUid, setDeleteUid] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Add email to allowlist ─────────────────────────────────────────────────
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);

  // ── Remove from allowlist ──────────────────────────────────────────────────
  const [removePendingEmail, setRemovePendingEmail] = useState<string | null>(null);
  const [removingEmail, setRemovingEmail] = useState(false);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openRevoke(uid: string) {
    setRevokeUid(uid);
    setRevokeCode("");
    setDeleteUid(null);
  }

  function openDelete(uid: string) {
    setDeleteUid(uid);
    setRevokeUid(null);
    setRevokeCode("");
  }

  function cancelActions() {
    setRevokeUid(null);
    setDeleteUid(null);
    setRevokeCode("");
  }

  async function handleRevoke(uid: string) {
    if (revokeCode !== "2612") return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to revoke user.");
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, disabled: true } : u))
      );
      cancelActions();
      toast.success("User revoked. They will be redirected to login on next visit.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke user.");
    } finally {
      setRevoking(false);
    }
  }

  async function handleEnable(uid: string) {
    try {
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to enable user.");
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, disabled: false } : u))
      );
      toast.success("User enabled. They can log in again.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to enable user.");
    }
  }

  async function handleDelete(uid: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${uid}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to delete user.");
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      cancelActions();
      toast.success("User deleted permanently.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddEmail() {
    const trimmed = newEmail.trim();
    if (!trimmed.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    setAddingEmail(true);
    try {
      const res = await fetch("/api/admin/allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to add email.");
      const normalized = trimmed.toLowerCase();
      setAllowlist((prev) =>
        prev.includes(normalized) ? prev : [...prev, normalized].sort()
      );
      setNewEmail("");
      setShowAddEmail(false);
      toast.success("Email added to allowlist.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add email.");
    } finally {
      setAddingEmail(false);
    }
  }

  async function handleRemoveEmail(email: string) {
    setRemovingEmail(true);
    try {
      const res = await fetch(`/api/admin/allowlist/${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Failed to remove email.");
      setAllowlist((prev) => prev.filter((e) => e !== email));
      setRemovePendingEmail(null);
      toast.success("Email removed from allowlist.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove email.");
    } finally {
      setRemovingEmail(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <Link
          href="/dashboard"
          className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-400
                     hover:text-black transition-colors"
        >
          ← Dashboard
        </Link>
        <div className="mt-3">
          <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.2em] mb-1">
            Admin
          </p>
          <h1 className="text-lg font-semibold text-black tracking-tight">
            User Management
          </h1>
        </div>
      </div>

      {/* ── Firebase Accounts ─────────────────────────────────────────────── */}
      <section>
        <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.2em] mb-3">
          Firebase Accounts &mdash; {users.length} user{users.length !== 1 ? "s" : ""}
        </p>

        <div className="border border-neutral-200 divide-y divide-neutral-100">
          {users.length === 0 && (
            <p className="text-sm text-neutral-400 px-4 py-6 text-center">
              No users found.
            </p>
          )}

          {users.map((u) => {
            const isSelf = u.email === currentUserEmail;
            const isRevokePending = revokeUid === u.uid;
            const isDeletePending = deleteUid === u.uid;

            return (
              <div key={u.uid}>
                {/* Main row */}
                <div className="flex items-center justify-between px-4 py-3 gap-4">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="text-sm font-mono text-black truncate">
                      {u.email}
                    </span>
                    <span
                      className={`font-mono text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5 border ${
                        u.disabled
                          ? "bg-red-50 text-red-500 border-red-200"
                          : "bg-emerald-50 text-emerald-600 border-emerald-200"
                      }`}
                    >
                      {u.disabled ? "Revoked" : "Active"}
                    </span>
                    {isSelf && (
                      <span className="font-mono text-[9px] uppercase tracking-[0.15em] px-1.5 py-0.5 bg-neutral-100 text-neutral-400 border border-neutral-200">
                        You
                      </span>
                    )}
                  </div>

                  {/* Action buttons — hidden for self */}
                  {!isSelf && (
                    <div className="flex items-center gap-2 shrink-0">
                      {!u.disabled && !isRevokePending && !isDeletePending && (
                        <button
                          onClick={() => openRevoke(u.uid)}
                          className="font-mono text-[10px] uppercase tracking-[0.15em] px-2.5 py-1
                                     border border-orange-300 text-orange-500
                                     hover:bg-orange-50 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                      {u.disabled && !isDeletePending && !isRevokePending && (
                        <button
                          onClick={() => handleEnable(u.uid)}
                          className="font-mono text-[10px] uppercase tracking-[0.15em] px-2.5 py-1
                                     border border-emerald-300 text-emerald-600
                                     hover:bg-emerald-50 transition-colors"
                        >
                          Enable
                        </button>
                      )}
                      {!isDeletePending && !isRevokePending && (
                        <button
                          onClick={() => openDelete(u.uid)}
                          className="font-mono text-[10px] uppercase tracking-[0.15em] px-2.5 py-1
                                     border border-red-300 text-red-500
                                     hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                      {(isRevokePending || isDeletePending) && (
                        <button
                          onClick={cancelActions}
                          className="font-mono text-[10px] uppercase tracking-[0.15em] px-2.5 py-1
                                     border border-neutral-300 text-neutral-500
                                     hover:border-black transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Revoke confirmation row */}
                {isRevokePending && (
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-orange-50 border-t border-orange-100">
                    <span className="font-mono text-[10px] text-orange-700 uppercase tracking-widest">
                      Enter code to confirm:
                    </span>
                    <input
                      type="password"
                      value={revokeCode}
                      onChange={(e) => setRevokeCode(e.target.value)}
                      placeholder="••••"
                      autoFocus
                      className="border border-orange-300 bg-white px-2.5 py-1 text-sm text-black
                                 w-24 focus:outline-none focus:border-orange-500 font-mono"
                    />
                    <button
                      onClick={() => handleRevoke(u.uid)}
                      disabled={revokeCode !== "2612" || revoking}
                      className="font-mono text-[10px] uppercase tracking-[0.15em] px-3 py-1
                                 bg-orange-500 text-white border border-orange-500
                                 hover:bg-orange-600 transition-colors
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {revoking ? "Revoking…" : "Yes, Revoke"}
                    </button>
                  </div>
                )}

                {/* Delete confirmation row */}
                {isDeletePending && (
                  <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-red-50 border-t border-red-100">
                    <span className="font-mono text-[10px] text-red-700 uppercase tracking-widest">
                      Permanently delete this account?
                    </span>
                    <button
                      onClick={() => handleDelete(u.uid)}
                      disabled={deleting}
                      className="font-mono text-[10px] uppercase tracking-[0.15em] px-3 py-1
                                 bg-red-500 text-white border border-red-500
                                 hover:bg-red-600 transition-colors
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {deleting ? "Deleting…" : "Yes, Delete"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Signup Allowlist ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3 gap-4">
          <p className="font-mono text-[10px] text-neutral-400 uppercase tracking-[0.2em]">
            Signup Allowlist &mdash; {allowlist.length} email{allowlist.length !== 1 ? "s" : ""}
          </p>

          {/* Add email — inline input or button */}
          {showAddEmail ? (
            <div className="flex items-center gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddEmail();
                  if (e.key === "Escape") {
                    setShowAddEmail(false);
                    setNewEmail("");
                  }
                }}
                placeholder="person@example.com"
                autoFocus
                className="border border-neutral-300 bg-white px-2.5 py-1 text-sm font-mono
                           text-black w-52 focus:outline-none focus:border-black"
              />
              <button
                onClick={handleAddEmail}
                disabled={addingEmail || !newEmail.trim()}
                className="font-mono text-[10px] uppercase tracking-[0.15em] px-2.5 py-1
                           bg-black text-white border border-black
                           hover:bg-neutral-800 transition-colors
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {addingEmail ? "Adding…" : "Add"}
              </button>
              <button
                onClick={() => {
                  setShowAddEmail(false);
                  setNewEmail("");
                }}
                className="p-1 text-neutral-400 hover:text-black transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddEmail(true)}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase
                         tracking-[0.15em] text-neutral-500 border border-neutral-300
                         px-2.5 py-1 hover:border-black hover:text-black transition-colors"
            >
              <Plus size={11} />
              Add Email
            </button>
          )}
        </div>

        <div className="border border-neutral-200 divide-y divide-neutral-100">
          {allowlist.length === 0 && (
            <p className="text-sm text-neutral-400 px-4 py-6 text-center">
              No emails in allowlist. Add one to allow sign-up.
            </p>
          )}

          {allowlist.map((email) => {
            const isRemovePending = removePendingEmail === email;
            return (
              <div key={email} className="flex items-center justify-between px-4 py-3 gap-4">
                <span className="text-sm font-mono text-black truncate">{email}</span>
                {!isRemovePending ? (
                  <button
                    onClick={() => setRemovePendingEmail(email)}
                    className="font-mono text-[10px] uppercase tracking-[0.15em] px-2.5 py-1
                               border border-neutral-300 text-neutral-500 shrink-0
                               hover:border-red-300 hover:text-red-500 transition-colors"
                  >
                    Remove
                  </button>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      disabled={removingEmail}
                      className="font-mono text-[10px] uppercase tracking-[0.15em] px-2.5 py-1
                                 bg-red-500 text-white border border-red-500
                                 hover:bg-red-600 transition-colors
                                 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {removingEmail ? "Removing…" : "Yes, Remove"}
                    </button>
                    <button
                      onClick={() => setRemovePendingEmail(null)}
                      className="font-mono text-[10px] uppercase tracking-[0.15em] px-2.5 py-1
                                 border border-neutral-300 text-neutral-500
                                 hover:border-black transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-2 font-mono text-[10px] text-neutral-400 leading-relaxed">
          Only these emails can create a new account. Existing accounts are not affected by
          changes here.
        </p>
      </section>
    </div>
  );
}
