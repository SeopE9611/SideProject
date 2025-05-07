import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;
const options = {};

let client: MongoClient | null = null;
let db: any = null;

export const connectToDatabase = async () => {
  if (!client) {
    client = await MongoClient.connect(uri, options);
  }

  if (!db) {
    db = client.db();
  }

  return db;
};
