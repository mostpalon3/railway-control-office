import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB ?? "rco";
const SHOULD_ENSURE_INDEXES =
  process.env.MONGODB_ENSURE_INDEXES === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.MONGODB_ENSURE_INDEXES !== "false");

// Global singleton — reused across requests in both dev (hot-reload) and prod
// (serverless: each Lambda instance keeps one pool, avoiding a new TCP
// handshake to Atlas on every request).
declare global {
  var _mongoClient: MongoClient | undefined;
}

async function ensureIndexes(db: Db) {
  try {
    await db.collection("entries").createIndex({ session_id: 1, created_at: -1 });
    await db.collection("entries").createIndex({ session_id: 1, loco1: 1 }, { unique: true });
    await db.collection("sessions").createIndex({ started_at: -1 });
    await db.collection("sessions").createIndex(
      { name: 1 },
      { unique: true, collation: { locale: "en", strength: 2 } }
    );
    await db.collection("presence").createIndex({ session_id: 1, last_seen: -1 });
    await db.collection("presence").createIndex({ session_id: 1, uid: 1 }, { unique: true });
  } catch {
    // Indexes already exist — safe to ignore
  }
}

async function getClient(): Promise<MongoClient> {
  if (!global._mongoClient) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    global._mongoClient = client;
    if (SHOULD_ENSURE_INDEXES) {
      await ensureIndexes(client.db(dbName));
    }
  }
  return global._mongoClient!;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}
