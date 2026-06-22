import ProductDetailClient from "@/app/products/[id]/ProductDetailClient";
import { verifyAccessToken } from "@/lib/auth.utils";
import { getDb } from "@/lib/mongodb";
import { publicProductFilter } from "@/lib/public-visibility";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "스트링 상세",
};

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function normalizeErrorForLog(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}

const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

async function withRetry<T>(
  task: (attempt: number) => Promise<T>,
  options?: {
    retries?: number;
    delayMs?: number;
    onError?: (error: unknown, attempt: number, elapsedMs: number) => void;
  },
) {
  const retries = options?.retries ?? 2;
  const delayMs = options?.delayMs ?? 150;
  const startedAt = Date.now();
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      options?.onError?.(error, attempt, Date.now() - startedAt);
      if (attempt > retries) break;
      await sleep(delayMs * attempt);
    }
  }

  throw lastError;
}

function ProductDetailLoadError({ id }: { id: string }) {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-lg border border-border bg-card p-6 text-card-foreground">
        <p className="font-semibold text-destructive">
          상품 정보를 불러오지 못했습니다. 일시적인 연결 문제일 수 있어요.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/products/${id}`}
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            다시 시도
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium"
          >
            스트링 목록으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return (
      <div className="p-6 text-destructive font-bold">
        상품을 찾을 수 없습니다
      </div>
    );
  }
  const productObjectId = new ObjectId(id);
  let db;
  try {
    db = await withRetry(async () => getDb(), {
      retries: 2,
      delayMs: 150,
      onError: (retryError, attempt, elapsedMs) => {
        console.error("[products/[id]] product detail load failed", {
          productId: id,
          stage: "connect-db",
          attempt,
          elapsedMs,
          error: normalizeErrorForLog(retryError),
        });
      },
    });
  } catch (error) {
    console.error("[products/[id]] failed to connect database", {
      productId: id,
      stage: "connect-db",
      error: normalizeErrorForLog(error),
    });
    return <ProductDetailLoadError id={id} />;
  }

  const token = (await cookies()).get("accessToken")?.value;
  let currentUserId: ObjectId | null = null;
  const payload = safeVerifyAccessToken(token);
  if (payload?.sub) {
    const payloadSub = String(payload.sub);
    if (ObjectId.isValid(payloadSub)) {
      currentUserId = new ObjectId(payloadSub);
    }
  }

  let product;
  try {
    product = await withRetry(
      async () => db.collection("products").findOne({ _id: productObjectId, ...publicProductFilter }),
      {
        retries: 2,
        delayMs: 150,
        onError: (retryError, attempt, elapsedMs) => {
          console.error("[products/[id]] product detail load failed", {
            productId: id,
            stage: "find-product",
            attempt,
            elapsedMs,
            error: normalizeErrorForLog(retryError),
          });
        },
      },
    );
  } catch (error) {
    console.error("[products/[id]] failed to load product", {
      productId: id,
      stage: "find-product",
      error: normalizeErrorForLog(error),
    });
    return <ProductDetailLoadError id={id} />;
  }

  if (!product)
    return (
      <div className="p-6 text-destructive font-bold">
        상품을 찾을 수 없습니다
      </div>
    );

  // 최신 리뷰 10개 (숨김 포함) — 서버에서 보안 마스킹
  let reviews: Array<Record<string, unknown>> = [];
  let agg: Array<{ avg?: number; count?: number }> = [];

  try {
    reviews = await db
      .collection("reviews")
      .aggregate([
        {
          $match: {
            productId: new ObjectId(id),
            status: { $in: ["visible", "hidden"] },
            isDeleted: { $ne: true },
          },
        },
        { $sort: { createdAt: -1, _id: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 1,
            rating: 1,
            createdAt: 1,
            status: 1,
            helpfulCount: 1,
            userId: 1, // ownedByMe 계산용 (다음 스테이지에서 제거)
            // 숨김이면 보안상 원본 차단(마스킹)
            userName: {
              $cond: [{ $eq: ["$status", "hidden"] }, null, "$userName"],
            },
            content: {
              $cond: [{ $eq: ["$status", "hidden"] }, null, "$content"],
            },
            photos: {
              $cond: [
                { $eq: ["$status", "hidden"] },
                [],
                { $ifNull: ["$photos", []] },
              ],
            },
            masked: { $eq: ["$status", "hidden"] },
          },
        },
        ...(currentUserId
          ? [{ $addFields: { ownedByMe: { $eq: ["$userId", currentUserId] } } }]
          : [{ $addFields: { ownedByMe: false } }]),
        { $project: { userId: 0 } }, // 노출 불가
      ])
      .toArray();

    agg = await db
      .collection("reviews")
      .aggregate([
        {
          $match: {
            productId: new ObjectId(id),
            status: "visible",
            isDeleted: { $ne: true },
          },
        },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ])
      .toArray();
  } catch (error) {
    console.error("[products/[id]] failed to load product reviews", {
      productId: id,
      error: normalizeErrorForLog(error),
    });
    reviews = [];
    agg = [];
  }

  (product as any).reviews = reviews.map((r: any) => ({
    _id: r._id,
    user: r.userName,
    rating: r.rating,
    date: r.createdAt?.toISOString().slice(0, 10),
    content: r.content,
    status: r.status,
    photos: r.photos,
    masked: r.masked,
    ownedByMe: r.ownedByMe,
  }));
  (product as any).reviewSummary = {
    average: agg[0]?.avg ? Number(agg[0].avg.toFixed(2)) : 0,
    count: agg[0]?.count ?? 0,
  };

  if (!product.relatedProducts) (product as any).relatedProducts = [];

  return <ProductDetailClient product={JSON.parse(JSON.stringify(product))} />;
}
