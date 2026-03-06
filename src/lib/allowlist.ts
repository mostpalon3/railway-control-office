import { getDb } from "@/lib/mongodb/client";

const COLLECTION = "allowed_emails";

// These two are always seeded so the admins can always sign up
const SEED_EMAILS = ["sumitsagar2612@gmail.com", "shaileshkumar9771@gmail.com"];

/**
 * On first startup (empty collection), inserts the two admin emails.
 * Idempotent — safe to call on every signup attempt.
 */
export async function seedAllowlistIfEmpty(): Promise<void> {
  try {
    const db = await getDb();
    const count = await db.collection(COLLECTION).countDocuments();
    if (count === 0) {
      await db.collection(COLLECTION).insertMany(
        SEED_EMAILS.map((email) => ({ email: email.toLowerCase() }))
      );
    }
  } catch {
    // Non-fatal — allowlist check will fail gracefully
  }
}

export async function isEmailAllowed(email: string): Promise<boolean> {
  await seedAllowlistIfEmpty();
  const db = await getDb();
  const doc = await db
    .collection(COLLECTION)
    .findOne({ email: email.trim().toLowerCase() });
  return doc !== null;
}

export async function getAllowedEmails(): Promise<string[]> {
  const db = await getDb();
  const docs = await db
    .collection(COLLECTION)
    .find({})
    .sort({ email: 1 })
    .toArray();
  return docs.map((d) => d.email as string);
}

export async function addAllowedEmail(email: string): Promise<void> {
  const db = await getDb();
  const normalized = email.trim().toLowerCase();
  // upsert — safe to call multiple times
  await db
    .collection(COLLECTION)
    .updateOne({ email: normalized }, { $set: { email: normalized } }, { upsert: true });
}

export async function removeAllowedEmail(email: string): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).deleteOne({ email: email.trim().toLowerCase() });
}
