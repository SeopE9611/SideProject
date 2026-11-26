import { ObjectId, type Collection, type Document, type Filter, type WithId } from "mongodb";

type NeighborItem = { slug: string; title: string; publishedAt: string };
type Neighbor = { status: "found"; item: NeighborItem } | { status: "missing" | "unavailable" };
export type ContentNeighbors = { next: Neighbor; previous: Neighbor };
export type NeighborAnchor = { id: string; slug: string; publishedAt: string; sortOrder?: number };

export const NEWS_LIST_ORDER = { publishedAt: -1, _id: -1 } as const;
export const PROGRAM_LIST_ORDER = { sortOrder: 1, ...NEWS_LIST_ORDER } as const;
type ListOrder = typeof NEWS_LIST_ORDER | typeof PROGRAM_LIST_ORDER;
type Position = { publishedAt: Date; _id: ObjectId; sortOrder?: number };

const missing = { status: "missing" } as const;
const unavailable = { status: "unavailable" } as const;
export const noContentNeighbors: ContentNeighbors = { next: missing, previous: missing };
export const unavailableContentNeighbors: ContentNeighbors = { next: unavailable, previous: unavailable };

const PAGE_SIZE = 16;
const MAX_PAGES = 4;
const MAX_TIME_MS = 1000;

function toPosition(row: Document, order: ListOrder): Position | null {
  if (!(row._id instanceof ObjectId) || !(row.publishedAt instanceof Date) ||
      !Number.isFinite(row.publishedAt.getTime()) ||
      ("sortOrder" in order && !Number.isInteger(row.sortOrder))) return null;
  return { _id: row._id, publishedAt: row.publishedAt, sortOrder: row.sortOrder };
}

function positionBranches(order: ListOrder, cursor: Position, direction: 1 | -1): Filter<Document>[] {
  const equal: Document = {};
  return Object.entries(order).map(([field, sortDirection]) => {
    const value = cursor[field as keyof Position];
    const branch = { ...equal, [field]: { [sortDirection * direction > 0 ? "$gt" : "$lt"]: value } };
    equal[field] = value;
    return branch;
  });
}

function comparePositions(a: Position, b: Position, order: ListOrder) {
  return ("sortOrder" in order ? a.sortOrder! - b.sortOrder! : 0)
    || b.publishedAt.getTime() - a.publishedAt.getTime()
    || b._id.toHexString().localeCompare(a._id.toHexString());
}

export async function findMongoContentNeighbors(
  collection: Collection<Document>,
  current: NeighborAnchor,
  filter: Filter<Document>,
  projection: Document,
  isValid: (candidate: WithId<Document>) => boolean,
  { order, checkMembership = false, listLimit }: { order: ListOrder; checkMembership?: boolean; listLimit?: number },
): Promise<ContentNeighbors> {
  if (!/^[0-9a-f]{24}$/.test(current.id)) return unavailableContentNeighbors;
  const id = new ObjectId(current.id);
  const position = toPosition({ _id: id, publishedAt: new Date(current.publishedAt), sortOrder: current.sortOrder }, order);
  if (!position) return unavailableContentNeighbors;
  if (checkMembership && !await collection.findOne(
    { $and: [filter, { _id: id }] }, { projection: { _id: 1 }, maxTimeMS: MAX_TIME_MS },
  )) return unavailableContentNeighbors;

  let scope = filter;
  if (listLimit !== undefined) {
    // 목록과 같은 순서로 원본 조회의 마지막 행을 찾습니다. 목록 이후의 글은 탐색 범위 밖입니다.
    const [last] = await collection.find(filter, {
      projection: { _id: 1, publishedAt: 1, sortOrder: 1 }, maxTimeMS: MAX_TIME_MS,
    }).sort(order).skip(listLimit - 1).limit(1).toArray();
    if (last) {
      const boundary = toPosition(last, order);
      if (!boundary || comparePositions(position, boundary, order) > 0) return unavailableContentNeighbors;
      const boundaryMatch = { _id: boundary._id, publishedAt: boundary.publishedAt, sortOrder: boundary.sortOrder };
      scope = { $and: [filter, { $or: [...positionBranches(order, boundary, -1), boundaryMatch] }] };
    }
  }

  async function findNeighbor(direction: 1 | -1): Promise<Neighbor> {
    const sort = Object.entries(order).map(([field, sign]): [string, 1 | -1] =>
      [field, sign === direction ? 1 : -1]);
    let cursor = position!;
    for (let page = 0; page < MAX_PAGES; page++) {
      const candidates = await collection.find({
        $and: [scope, {
          slug: { $ne: current.slug },
          _id: { $type: "objectId", $ne: id },
          $or: positionBranches(order, cursor, direction),
        }],
      }, { projection, maxTimeMS: MAX_TIME_MS }).sort(sort).limit(PAGE_SIZE).toArray();

      for (const candidate of candidates) {
        if (isValid(candidate)) {
          const { slug, title, publishedAt } = candidate;
          return { status: "found", item: { slug, title, publishedAt: publishedAt.toISOString() } };
        }
      }
      if (candidates.length < PAGE_SIZE) return missing;
      const last = toPosition(candidates[candidates.length - 1], order);
      if (!last) return unavailable;
      cursor = last;
    }
    return unavailable;
  }

  // 다음 글은 목록의 위쪽이며, 이전 글은 목록의 아래쪽입니다.
  const [next, previous] = await Promise.allSettled([findNeighbor(-1), findNeighbor(1)]);
  if (next.status === "rejected" || previous.status === "rejected") console.error("공개 게시물 인접 글 조회 실패");
  return {
    next: next.status === "fulfilled" ? next.value : unavailable,
    previous: previous.status === "fulfilled" ? previous.value : unavailable,
  };
}

export function findFixtureContentNeighbors(current: NeighborAnchor, fixtures: readonly (NeighborAnchor & NeighborItem)[]): ContentNeighbors {
  const index = fixtures.findIndex((item) => item.id === current.id && item.slug === current.slug);
  if (index < 0) return unavailableContentNeighbors;
  function result(item?: NeighborItem): Neighbor {
    return item ? { status: "found", item: { slug: item.slug, title: item.title, publishedAt: item.publishedAt } } : missing;
  }
  return { next: result(fixtures[index - 1]), previous: result(fixtures[index + 1]) };
}
