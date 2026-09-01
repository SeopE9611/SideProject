#!/usr/bin/env node
import { MongoClient } from "mongodb";
import { RUNTIME_INDEX_SPECS } from "./index-specs.mjs";

const uri = process.env.SHALOM_MONGODB_URI;
const databaseName = process.env.SHALOM_MONGODB_DB || "shalom_house";

function deepEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => deepEqual(value, right[index]));
  }
  if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]));
}

function keysEqual(expected, actual) {
  const expectedEntries = Object.entries(expected);
  const actualEntries = Object.entries(actual);
  return expectedEntries.length === actualEntries.length && expectedEntries.every(([field, direction], index) => {
    const [actualField, actualDirection] = actualEntries[index] ?? [];
    return field === actualField && direction === actualDirection;
  });
}

function normalizedOptions(options) {
  const normalized = {};
  for (const key of ["unique", "sparse"]) normalized[key] = options[key] === true;
  if (options.expireAfterSeconds !== undefined) normalized.expireAfterSeconds = options.expireAfterSeconds;
  if (options.partialFilterExpression && Object.keys(options.partialFilterExpression).length > 0) {
    normalized.partialFilterExpression = options.partialFilterExpression;
  }
  return normalized;
}

function actualSpec(index) {
  return {
    keys: index.key,
    options: normalizedOptions(index),
  };
}

function expectedSpec(index) {
  return {
    keys: index.keys,
    options: normalizedOptions(index.options),
  };
}

function specsEqual(expected, actual) {
  return keysEqual(expected.keys, actual.keys) && deepEqual(expected.options, actual.options);
}

function safeErrorMessage(error) {
  if (error && typeof error === "object" && "name" in error && typeof error.name === "string") return error.name;
  return "알 수 없는 오류";
}

function isMissingNamespace(error) {
  return Boolean(error && typeof error === "object" && (error.code === 26 || error.codeName === "NamespaceNotFound"));
}

if (!uri) {
  console.error("[check-runtime-indexes] SHALOM_MONGODB_URI 환경 변수가 필요합니다.");
  process.exitCode = 1;
} else {
  const client = new MongoClient(uri);
  const counts = { OK: 0, MISSING: 0, MISMATCH: 0, NAME_MISMATCH: 0, EXTRA: 0 };
  try {
    await client.connect();
    const database = client.db(databaseName);

    for (const [collectionName, expectedIndexes] of Object.entries(RUNTIME_INDEX_SPECS)) {
      let actualIndexes;
      try {
        actualIndexes = await database.collection(collectionName).listIndexes().toArray();
      } catch (error) {
        if (!isMissingNamespace(error)) throw error;
        actualIndexes = [];
      }

      const matchedActualNames = new Set(["_id_"]);
      for (const expectedIndex of expectedIndexes) {
        const expected = expectedSpec(expectedIndex);
        const sameName = actualIndexes.find((index) => index.name === expectedIndex.name);
        if (sameName) {
          matchedActualNames.add(sameName.name);
          const actual = actualSpec(sameName);
          if (specsEqual(expected, actual)) {
            counts.OK += 1;
            console.log(`[OK] ${collectionName}.${expectedIndex.name}`);
          } else {
            counts.MISMATCH += 1;
            console.log(`[MISMATCH] ${collectionName}.${expectedIndex.name} expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
          }
          continue;
        }

        const equivalent = actualIndexes.find((index) => index.name !== "_id_" && !matchedActualNames.has(index.name) && specsEqual(expected, actualSpec(index)));
        if (equivalent) {
          matchedActualNames.add(equivalent.name);
          counts.NAME_MISMATCH += 1;
          console.log(`[NAME_MISMATCH] ${collectionName}.${expectedIndex.name} existsAs=${equivalent.name}`);
        } else {
          counts.MISSING += 1;
          console.log(`[MISSING] ${collectionName}.${expectedIndex.name}`);
        }
      }

      for (const actualIndex of actualIndexes) {
        if (!matchedActualNames.has(actualIndex.name)) {
          counts.EXTRA += 1;
          console.log(`[EXTRA] ${collectionName}.${actualIndex.name}`);
        }
      }
    }

    console.log(`[check-runtime-indexes] summary OK=${counts.OK} MISSING=${counts.MISSING} MISMATCH=${counts.MISMATCH} NAME_MISMATCH=${counts.NAME_MISMATCH} EXTRA=${counts.EXTRA}`);
    if (counts.MISSING > 0 || counts.MISMATCH > 0) process.exitCode = 2;
  } catch (error) {
    console.error(`[check-runtime-indexes] 인덱스 검사에 실패했습니다: ${safeErrorMessage(error)}`);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}
