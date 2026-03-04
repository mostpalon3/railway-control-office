import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB ?? "rco";

// Global singleton — reused across requests in both dev (hot-reload) and prod
// (serverless: each Lambda instance keeps one pool, avoiding a new TCP
// handshake to Atlas on every request).
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

async function ensureIndexes(db: Db) {
  try {
    await db.collection("entries").createIndex({ session_id: 1 });
    await db.collection("entries").createIndex({ session_id: 1, loco1: 1 });
    await db.collection("sessions").createIndex({ created_by: 1 });
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
    await ensureIndexes(client.db(dbName));
  }
  return global._mongoClient!;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}
