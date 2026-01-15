import type { Db } from 'mongodb';

export async function ensureUsedRacketsIndexes(db: Db) {
  const col = db.collection('used_rackets');

  // 공통: 활성(status) 필터 + 최신순 정렬
  await col.createIndex({ status: 1, createdAt: -1 });

  // 자주 쓰는 필터
  await col.createIndex({ brand: 1, status: 1 });
  await col.createIndex({ condition: 1, status: 1 });
  await col.createIndex({ price: 1, status: 1 });

  // Finder 범위검색(각 spec 필드별)
  await col.createIndex({ 'spec.headSize': 1 });
  await col.createIndex({ 'spec.weight': 1 });
  await col.createIndex({ 'spec.balance': 1 });
  await col.createIndex({ 'spec.lengthIn': 1 });
  await col.createIndex({ 'spec.stiffnessRa': 1 });
  await col.createIndex({ 'spec.swingWeight': 1 });
  await col.createIndex({ 'spec.pattern': 1 });
}
