export type MongoMatch = Record<string, unknown>;

export function appendMatchCondition(match: MongoMatch, condition: MongoMatch): void {
  const existingAnd = Array.isArray(match.$and) ? [...match.$and] : [];

  if (Array.isArray(match.$or)) {
    existingAnd.push({ $or: match.$or });
    delete match.$or;
  }

  existingAnd.push(condition);
  match.$and = existingAnd;
}
