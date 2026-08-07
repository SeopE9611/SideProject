import { getDb } from "@/lib/mongodb";
import {
  normalizeColorRows,
  normalizeGaugeRows,
  normalizeVariantRows,
} from "@/lib/products/string-stock";
import { productVisibilityFilterFor } from "@/lib/public-visibility";
import { getVisibilityViewerFromCookies } from "@/lib/public-visibility-viewer";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

type StockSnapshotRequestItem = {
  id: string;
  selectedGauge?: string;
  selectedColor?: string;
};

type StockSnapshotStatus = "available" | "sold_out" | "option_missing" | "unavailable";

type StockSnapshotRow = StockSnapshotRequestItem & {
  stock: number;
  status: StockSnapshotStatus;
};

type ProductStockDocument = {
  _id: ObjectId;
  inventory?: {
    stock?: unknown;
    status?: unknown;
  };
  variantInventories?: unknown[];
  gaugeInventories?: unknown[];
  gaugeOptions?: unknown[];
  colorInventories?: unknown[];
  colorOptions?: unknown[];
  color?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeStock = (value: unknown) => {
  const stock = Number(value ?? 0);

  return Number.isFinite(stock) && stock > 0 ? stock : 0;
};

const minStock = (stocks: number[]) =>
  stocks.length > 0 ? Math.min(...stocks.map((stock) => Math.max(0, stock))) : 0;

function resolveStockSnapshot(
  item: StockSnapshotRequestItem,
  product: ProductStockDocument | undefined,
): StockSnapshotRow {
  if (!product) {
    return {
      ...item,
      stock: 0,
      status: "unavailable",
    };
  }

  const selectedGauge = normalizeText(item.selectedGauge);
  const selectedColor = normalizeText(item.selectedColor);

  const inventoryStock = normalizeStock(product.inventory?.stock);
  const inventorySoldOut = String(product.inventory?.status ?? "") === "outofstock";

  const variantRows = normalizeVariantRows(product);

  const managedGaugeRows =
    Array.isArray(product.gaugeInventories) && product.gaugeInventories.length > 0
      ? normalizeGaugeRows({
          gaugeInventories: product.gaugeInventories,
        })
      : [];

  const managedColorRows =
    Array.isArray(product.colorInventories) && product.colorInventories.length > 0
      ? normalizeColorRows({
          colorInventories: product.colorInventories,
        })
      : [];

  /*
   * 1. 색상 + 게이지 조합 재고
   *
   * 현재 주문 생성 로직에서도 variantInventories의
   * colorValue + gaugeValue 조합을 기준으로 차감하므로
   * 장바구니도 동일한 기준을 사용해야 합니다.
   */
  if (variantRows.length > 0) {
    if (!selectedColor || !selectedGauge) {
      return {
        ...item,
        stock: 0,
        status: "option_missing",
      };
    }

    const variant = variantRows.find(
      (row) => row.colorValue === selectedColor && row.gaugeValue === selectedGauge,
    );

    if (!variant) {
      return {
        ...item,
        stock: 0,
        status: "option_missing",
      };
    }

    /*
     * 주문 생성 시 variant뿐 아니라
     * gauge/color/global inventory도 함께 확인/차감합니다.
     */
    const gaugeRow = managedGaugeRows.find((row) => row.value === selectedGauge);

    const colorRow = managedColorRows.find((row) => row.value === selectedColor);

    if (!gaugeRow || !colorRow) {
      return {
        ...item,
        stock: 0,
        status: "option_missing",
      };
    }

    const stock = minStock([
      variant.isSoldOut ? 0 : normalizeStock(variant.stock),
      gaugeRow.isSoldOut ? 0 : normalizeStock(gaugeRow.stock),
      colorRow.isSoldOut ? 0 : normalizeStock(colorRow.stock),
      inventoryStock,
    ]);

    const soldOut =
      variant.isSoldOut ||
      gaugeRow.isSoldOut ||
      colorRow.isSoldOut ||
      inventorySoldOut ||
      stock <= 0;

    return {
      ...item,
      stock: soldOut ? 0 : stock,
      status: soldOut ? "sold_out" : "available",
    };
  }

  /*
   * 2. 게이지별 재고
   */
  if (selectedGauge) {
    const gaugeRow = managedGaugeRows.find((row) => row.value === selectedGauge);

    if (!gaugeRow) {
      return {
        ...item,
        stock: 0,
        status: "option_missing",
      };
    }

    const constraints = [gaugeRow.isSoldOut ? 0 : normalizeStock(gaugeRow.stock), inventoryStock];

    /*
     * 색상 재고까지 관리하는 상품이라면
     * 선택한 색상의 재고도 실제 한도에 포함합니다.
     */
    if (selectedColor && managedColorRows.length > 0) {
      const colorRow = managedColorRows.find((row) => row.value === selectedColor);

      if (!colorRow) {
        return {
          ...item,
          stock: 0,
          status: "option_missing",
        };
      }

      constraints.push(colorRow.isSoldOut ? 0 : normalizeStock(colorRow.stock));
    }

    const stock = minStock(constraints);

    const soldOut = gaugeRow.isSoldOut || inventorySoldOut || stock <= 0;

    return {
      ...item,
      stock: soldOut ? 0 : stock,
      status: soldOut ? "sold_out" : "available",
    };
  }

  /*
   * 3. 색상별 재고
   */
  if (selectedColor && managedColorRows.length > 0) {
    const colorRow = managedColorRows.find((row) => row.value === selectedColor);

    if (!colorRow) {
      return {
        ...item,
        stock: 0,
        status: "option_missing",
      };
    }

    const stock = minStock([
      colorRow.isSoldOut ? 0 : normalizeStock(colorRow.stock),
      inventoryStock,
    ]);

    const soldOut = colorRow.isSoldOut || inventorySoldOut || stock <= 0;

    return {
      ...item,
      stock: soldOut ? 0 : stock,
      status: soldOut ? "sold_out" : "available",
    };
  }

  /*
   * 4. 별도 옵션 재고가 없는 상품
   */
  const soldOut = inventorySoldOut || inventoryStock <= 0;

  return {
    ...item,
    stock: soldOut ? 0 : inventoryStock,
    status: soldOut ? "sold_out" : "available",
  };
}

export async function POST(req: Request) {
  let requestedItems: StockSnapshotRequestItem[] = [];

  try {
    const body: unknown = await req.json();
    const bodyRecord = isRecord(body) ? body : {};

    const rawItems = Array.isArray(bodyRecord.items) ? bodyRecord.items : [];

    if (rawItems.length > 50) {
      return NextResponse.json(
        {
          ok: false,
          error: "tooManyItems",
        },
        {
          status: 400,
        },
      );
    }

    requestedItems = rawItems
      .map((rawItem) => {
        const item = isRecord(rawItem) ? rawItem : {};

        return {
          id: normalizeText(item.id),
          selectedGauge: normalizeText(item.selectedGauge) || undefined,
          selectedColor: normalizeText(item.selectedColor) || undefined,
        };
      })
      .filter((item) => item.id.length > 0);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "invalidBody",
      },
      {
        status: 400,
      },
    );
  }

  if (requestedItems.length === 0) {
    return NextResponse.json(
      {
        ok: true,
        items: [] as StockSnapshotRow[],
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const validIds = Array.from(
    new Set(requestedItems.map((item) => item.id).filter((id) => ObjectId.isValid(id))),
  );

  const objectIds = validIds.map((id) => new ObjectId(id));

  const db = await getDb();
  const viewer = await getVisibilityViewerFromCookies();

  const products =
    objectIds.length > 0
      ? await db
          .collection("products")
          .find(
            {
              _id: {
                $in: objectIds,
              },
              ...productVisibilityFilterFor(viewer),
            },
            {
              projection: {
                _id: 1,
                inventory: 1,
                variantInventories: 1,
                gaugeInventories: 1,
                colorInventories: 1,
              },
            },
          )
          .toArray()
      : [];

  const productById = new Map<string, ProductStockDocument>(
    products.map((product) => [String(product._id), product as unknown as ProductStockDocument]),
  );

  const items = requestedItems.map((item) => resolveStockSnapshot(item, productById.get(item.id)));

  return NextResponse.json(
    {
      ok: true,
      items,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
