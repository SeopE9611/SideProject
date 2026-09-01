import { MongoClient, type Db } from "mongodb";

const defaultDatabaseName = "shalom_house";

declare global {
  var shalomMongoClientPromise: Promise<MongoClient> | undefined;
}

function connectMongoClient(uri: string): Promise<MongoClient> {
  const client = new MongoClient(uri);
  const connection = client.connect();

  globalThis.shalomMongoClientPromise = connection;
  connection.catch(() => {
    if (globalThis.shalomMongoClientPromise === connection) {
      globalThis.shalomMongoClientPromise = undefined;
    }
  });

  return connection;
}

export async function getMongoDatabase(): Promise<Db> {
  const client = await getMongoClient();

  return client.db(process.env.SHALOM_MONGODB_DB || defaultDatabaseName);
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = process.env.SHALOM_MONGODB_URI;

  if (!uri) {
    throw new Error("SHALOM_MONGODB_URI가 설정되지 않았습니다.");
  }

  return globalThis.shalomMongoClientPromise ?? connectMongoClient(uri);
}
