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
import { PublicPageHero, ResultState } from "@/components/public";
import { Button } from "@/components/ui/button";

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

function ProductDetailResult({ id, status }: { id?: string; status: "not-found" | "load-error" }) {
  const isLoadError = status === "load-error";
  return (
    <main className="min-h-screen bg-background pb-10">
      <PublicPageHero
        variant="feature"
        eyebrow="상품 상세"
        title={isLoadError ? "상품 정보를 불러오지 못했습니다" : "상품을 찾을 수 없습니다"}
        description={
          isLoadError
            ? "일시적인 연결 문제일 수 있어요. 잠시 후 다시 시도해 주세요. 문제가 계속되면 관리자에게 문의해 주세요."
            : "요청하신 상품이 없거나 현재 공개되어 있지 않습니다."
        }
      />
      <div className="mx-auto max-w-2xl px-4 pt-6">
        <ResultState
          status={isLoadError ? "error" : "warning"}
          title={isLoadError ? "다시 확인해 주세요" : "다른 상품을 둘러보세요"}
          description={
            isLoadError
              ? "상품 정보를 다시 불러올 수 있습니다."
              : "상품 목록에서 원하는 상품을 찾아보세요."
          }
          actions={
            <>
              {id && (
                <Button asChild className="rounded-control">
                  <Link href={`/products/${id}`}>다시 시도</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="rounded-control">
                <Link href="/products">상품 목록으로 이동</Link>
              </Button>
            </>
          }
        />
      </div>
    </main>
  );
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return <ProductDetailResult status="not-found" />;
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
    return <ProductDetailResult id={id} status="load-error" />;
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
    return <ProductDetailResult id={id} status="load-error" />;
  }

  if (!product) return <ProductDetailResult id={id} status="not-found" />;

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
