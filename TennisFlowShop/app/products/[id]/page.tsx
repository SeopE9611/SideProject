import ProductDetailClient from "@/app/products/[id]/ProductDetailClient";
import { verifyAccessToken } from "@/lib/auth.utils";
import { getDb } from "@/lib/mongodb";
import { productVisibilityFilterFor } from "@/lib/public-visibility";
import {
  getPublicReviewSurface,
  type PublicReviewSurfacePayload,
} from "@/lib/reviews/public-review-surface.server";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";
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
        <p className="mt-2 text-ui-body-sm text-muted-foreground">
          잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={`/products/${id}`}
            className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-ui-body-sm font-medium text-primary-foreground"
          >
            다시 시도
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center rounded-md border border-border px-3 py-2 text-ui-body-sm font-medium"
          >
            스트링 목록으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return <div className="p-6 text-destructive font-semibold">상품을 찾을 수 없습니다</div>;
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
      async () =>
        db.collection("products").findOne({
          _id: productObjectId,
          ...productVisibilityFilterFor(await getVisibilityViewerFromCookies()),
        }),
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
    return <div className="p-6 text-destructive font-semibold">상품을 찾을 수 없습니다</div>;

  let reviewSurface: PublicReviewSurfacePayload = {
    items: [],
    summary: { average: 0, count: 0 },
  };

  const viewerIsAdmin =
    (payload as any)?.role === "admin" ||
    (payload as any)?.role === "ADMIN" ||
    (payload as any)?.isAdmin === true ||
    (Array.isArray((payload as any)?.roles) && (payload as any).roles.includes("admin"));

  try {
    reviewSurface = await getPublicReviewSurface(db, {
      target: { type: "product", id },
      viewerUserId: currentUserId,
      viewerIsAdmin,
      limit: 10,
    });
  } catch (error) {
    console.error("[products/[id]] failed to load product reviews", {
      productId: id,
      error: normalizeErrorForLog(error),
    });
  }

  (product as any).reviews = reviewSurface.items;
  (product as any).reviewSummary = reviewSurface.summary;

  if (!product.relatedProducts) (product as any).relatedProducts = [];

  return <ProductDetailClient product={JSON.parse(JSON.stringify(product))} />;
}
