// lib/db.ts
import { MongoClient } from "mongodb"

const uri = process.env.MONGODB_URI
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI 환경변수가 설정되지 않았습니다.")
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient>
}

// 개발 환경에서는 핫 리로드로 인해 클라이언트가 중복 생성될 수 있으므로 globalThis 사용
if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri!, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri!, options)
  clientPromise = client.connect()
}

export default clientPromise
