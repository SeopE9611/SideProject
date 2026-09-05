import "server-only";

import {
  DEMO_STORAGE_BUCKET,
  PRODUCTION_STORAGE_BUCKET,
  SUPABASE_STORAGE_BUCKET,
} from "@/lib/storage-config";

export const IS_PORTFOLIO_DEMO = process.env.PORTFOLIO_DEMO_MODE === "true";

const expectedBucket = IS_PORTFOLIO_DEMO ? DEMO_STORAGE_BUCKET : PRODUCTION_STORAGE_BUCKET;

if (SUPABASE_STORAGE_BUCKET !== expectedBucket) {
  throw new Error(
    `Storage bucket configuration mismatch: expected ${expectedBucket} for the current environment.`,
  );
}

export const SERVER_STORAGE_BUCKET = expectedBucket;
