/**
 * Admin email check.
 * Source of truth is the ADMIN_EMAILS env var.
 * Falls back to the two hardcoded emails if the env var is missing.
 */
const FALLBACK_ADMINS = [
  "sumitsagar2612@gmail.com",
  "shaileshkumar9771@gmail.com",
];

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  const fromEnv = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  return FALLBACK_ADMINS.map((e) => e.toLowerCase());
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
