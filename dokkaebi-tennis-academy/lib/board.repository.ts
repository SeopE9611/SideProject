import { ObjectId, type Db, type Document, type Filter, type Sort } from 'mongodb';
import type { BoardKind } from '@/lib/types/board-domain';

export const API_VERSION = '2026-02-board-v1';

function toObjectId(id: string) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

export function collectionNameByKind(kind: BoardKind) {
  return kind === 'notice' || kind === 'qna' ? 'board_posts' : 'community_posts';
}

export async function findBoardPostById(db: Db, id: string, kind?: BoardKind) {
  const cols = kind ? [collectionNameByKind(kind)] : ['board_posts', 'community_posts'];
  for (const name of cols) {
    const col = db.collection(name);
    const oid = toObjectId(id);
    if (oid) {
      const found = await col.findOne({ _id: oid });
      if (found) return { found, collection: name };
    }
    const found = await col.findOne({ _id: id as any });
    if (found) return { found, collection: name };
  }
  return null;
}

export async function incrementBoardView(db: Db, id: string, kind?: BoardKind, field: 'viewCount' | 'views' = 'viewCount') {
  const cols = kind ? [collectionNameByKind(kind)] : ['board_posts', 'community_posts'];
  for (const name of cols) {
    const col = db.collection(name);
    const oid = toObjectId(id);
    if (oid) {
      const r = await col.updateOne({ _id: oid }, { $inc: { [field]: 1 } });
      if (r.matchedCount > 0) return true;
    }
    const r = await col.updateOne({ _id: id as any }, { $inc: { [field]: 1 } });
    if (r.matchedCount > 0) return true;
  }
  return false;
}

export async function findList(db: Db, collection: string, filter: Filter<Document>, projection: Document, sort: Sort, page: number, limit: number) {
  const col = db.collection(collection);
  const total = await col.countDocuments(filter);
  const items = await col
    .find(filter, { projection })
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
  return { total, items };
}
