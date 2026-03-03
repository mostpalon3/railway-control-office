import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;
const dbName = process.env.MONGODB_DB ?? "rco";

// Cached connection for dev (avoids reconnecting on every hot-reload)
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

async function createClient(): Promise<MongoClient> {
  const client = new MongoClient(uri);
  await client.connect();
  return client;
}

export async function getDb(): Promise<Db> {
  let client: MongoClient;

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClient) {
      global._mongoClient = await createClient();
    }
    client = global._mongoClient;
  } else {
    client = await createClient();
  }

  return client.db(dbName);
}
