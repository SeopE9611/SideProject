import { ObjectId, type Collection, type Document, type Filter, type WithId } from "mongodb";

type NeighborItem = { slug: string; title: string; publishedAt: string };
type Neighbor = { status: "found"; item: NeighborItem } | { status: "missing" | "unavailable" };
export type ContentNeighbors = { next: Neighbor; previous: Neighbor };
export type NeighborAnchor = { id: string; slug: string; category: string; publishedAt: string };

const missing = { status: "missing" } as const;
const unavailable = { status: "unavailable" } as const;
export const noContentNeighbors: ContentNeighbors = { next: missing, previous: missing };
export const unavailableContentNeighbors: ContentNeighbors = { next: unavailable, previous: unavailable };

const PAGE_SIZE = 16;
const MAX_PAGES = 4;

export async function findMongoContentNeighbors(
  collection: Collection<Document>,
  current: NeighborAnchor,
  filter: Filter<Document>,
  projection: Document,
  isValid: (candidate: WithId<Document>) => boolean,
): Promise<ContentNeighbors> {
  const publishedAt = new Date(current.publishedAt);
  if (!/^[0-9a-f]{24}$/.test(current.id) || !Number.isFinite(publishedAt.getTime())) return unavailableContentNeighbors;
  const id = new ObjectId(current.id);

  async function findNeighbor(order: 1 | -1): Promise<Neighbor> {
    const operator = order === 1 ? "$gt" : "$lt";
    let cursor = { publishedAt, id };
    for (let page = 0; page < MAX_PAGES; page++) {
      const candidates = await collection.find({
        $and: [filter, {
          category: current.category,
          slug: { $ne: current.slug },
          _id: { $type: "objectId", $ne: id },
          $or: [
            { publishedAt: { [operator]: cursor.publishedAt } },
            { publishedAt: cursor.publishedAt, _id: { [operator]: cursor.id } },
          ],
        }],
      }, { projection, maxTimeMS: 1000 })
        .sort({ publishedAt: order, _id: order }).limit(PAGE_SIZE).toArray();

      for (const candidate of candidates) {
        if (candidate.category === current.category && isValid(candidate)) {
          const { slug, title, publishedAt } = candidate;
          return { status: "found", item: { slug, title, publishedAt: publishedAt.toISOString() } };
        }
      }
      if (candidates.length < PAGE_SIZE) return missing;
      const last = candidates[candidates.length - 1];
      if (!(last._id instanceof ObjectId) || !(last.publishedAt instanceof Date) ||
          !Number.isFinite(last.publishedAt.getTime())) return unavailable;
      cursor = { publishedAt: last.publishedAt, id: last._id };
    }
    return unavailable;
  }

  const [next, previous] = await Promise.allSettled([findNeighbor(1), findNeighbor(-1)]);
  if (next.status === "rejected" || previous.status === "rejected") console.error("공개 게시물 인접 글 조회 실패");
  return {
    next: next.status === "fulfilled" ? next.value : unavailable,
    previous: previous.status === "fulfilled" ? previous.value : unavailable,
  };
}

export function findFixtureContentNeighbors(current: NeighborAnchor, fixtures: readonly (NeighborAnchor & NeighborItem)[]): ContentNeighbors {
  const now = Date.now();
  let next: (NeighborAnchor & NeighborItem) | undefined;
  let previous: (NeighborAnchor & NeighborItem) | undefined;
  function compare(a: NeighborAnchor, b: NeighborAnchor) {
    return Date.parse(a.publishedAt) - Date.parse(b.publishedAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }
  if (!Number.isFinite(Date.parse(current.publishedAt))) return unavailableContentNeighbors;
  for (const fixture of fixtures) {
    if (fixture.category !== current.category || fixture.id === current.id || fixture.slug === current.slug ||
        !Number.isFinite(Date.parse(fixture.publishedAt)) || Date.parse(fixture.publishedAt) > now) continue;
    const direction = compare(fixture, current);
    if (direction > 0 && (!next || compare(fixture, next) < 0)) next = fixture;
    if (direction < 0 && (!previous || compare(fixture, previous) > 0)) previous = fixture;
  }
  function result(item?: NeighborItem): Neighbor {
    return item ? { status: "found", item: { slug: item.slug, title: item.title, publishedAt: item.publishedAt } } : missing;
  }
  return { next: result(next), previous: result(previous) };
}
