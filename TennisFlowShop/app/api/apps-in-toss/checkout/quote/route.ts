import { applyAppsInTossCors, createAppsInTossPreflightResponse } from "@/lib/apps-in-toss";
import clientPromise from "@/lib/mongodb";
import { calculateCheckoutPayableAmount } from "@/lib/payments/toss/checkout-quote";
import { ObjectId } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

const QUOTE_CORS_OPTIONS = {
  methods: ["POST", "OPTIONS"],
  headers: ["Content-Type", "Accept"],
} as const;

type QuoteCollectionMethod = "self_ship" | "visit";

function createCorsJson(body: unknown, status: number, origin: string | null) {
  return applyAppsInTossCors(
    NextResponse.json(body, {
      status,
    }),
    origin,
    QUOTE_CORS_OPTIONS,
  );
}

export function OPTIONS(req: NextRequest) {
  return createAppsInTossPreflightResponse(req.headers.get("origin"), QUOTE_CORS_OPTIONS);
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");

  try {
    const body = await req.json().catch(() => null);

    const productId = String(body?.productId ?? "").trim();

    const collectionMethod = String(body?.collectionMethod ?? "").trim() as QuoteCollectionMethod;

    if (!ObjectId.isValid(productId)) {
      return createCorsJson(
        {
          success: false,
          message: "상품 정보가 올바르지 않습니다.",
        },
        400,
        origin,
      );
    }

    if (collectionMethod !== "self_ship" && collectionMethod !== "visit") {
      return createCorsJson(
        {
          success: false,
          message: "라켓 전달 방법이 올바르지 않습니다.",
        },
        400,
        origin,
      );
    }

    const client = await clientPromise;

    const db = client.db();

    const isVisit = collectionMethod === "visit";

    const quote = await calculateCheckoutPayableAmount({
      db,
      userId: null,
      items: [
        {
          productId,
          quantity: 1,
          kind: "product",
        },
      ],
      shippingInfo: {
        withStringService: true,
        deliveryMethod: isVisit ? "방문수령" : "택배수령",
        shippingMethod: isVisit ? "visit" : "self_ship",
      },
      pointsToUse: 0,
    });

    const item = quote.itemsWithSnapshot[0] ?? null;

    return createCorsJson(
      {
        success: true,
        subtotal: quote.subtotal,
        shippingFee: quote.shippingFee,
        serviceFee: quote.serviceFee,
        totalPrice: quote.originalTotalPrice,
        payableAmount: quote.payableTotalPrice,
        item,
      },
      200,
      origin,
    );
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_AVAILABLE") {
      return createCorsJson(
        {
          success: false,
          message: "현재 주문할 수 없는 상품입니다.",
        },
        404,
        origin,
      );
    }

    console.error("[Apps in Toss 주문 금액 조회 실패]", error);

    return createCorsJson(
      {
        success: false,
        message: "주문 금액을 확인하지 못했습니다.",
      },
      500,
      origin,
    );
  }
}
