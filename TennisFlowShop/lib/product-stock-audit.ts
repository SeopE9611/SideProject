import { ObjectId, type Db, type Document, type Filter, type UpdateFilter, type UpdateOptions, type UpdateResult } from "mongodb";

export type StockAuditContext = {
  operationId: string;
  reason: "order_created" | "order_canceled" | "admin_product_updated";
  mode: "automatic" | "admin";
  orderId?: string;
  applicationId?: string;
  actorId?: string;
};
export type StockQuantityChange = {
  axis: "total" | "variant" | "color" | "gauge";
  color?: string;
  gauge?: string;
  before: number | null;
  delta: number | null;
  after: number | null;
};

function quantities(product: Document) {
  const rows = new Map<string, Omit<StockQuantityChange, "before" | "delta" | "after"> & { value: number | null }>();
  const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;
  rows.set("total", { axis: "total", value: number(product.inventory?.stock) });
  for (const row of Array.isArray(product.variantInventories) ? product.variantInventories : []) {
    const key = JSON.stringify(["variant", row.colorValue, row.gaugeValue]);
    if (rows.has(key)) throw new Error("STOCK_AUDIT_DUPLICATE_OPTION");
    rows.set(key, { axis: "variant", color: String(row.colorValue), gauge: String(row.gaugeValue), value: number(row.stock) });
  }
  for (const [field, axis] of [["colorInventories", "color"], ["gaugeInventories", "gauge"]] as const) {
    for (const row of Array.isArray(product[field]) ? product[field] : []) {
      const key = JSON.stringify([axis, row.value]);
      if (rows.has(key)) throw new Error("STOCK_AUDIT_DUPLICATE_OPTION");
      rows.set(key, { axis, [axis]: String(row.value), value: number(row.stock) });
    }
  }
  return rows;
}

export function stockQuantityChanges(before: Document, after: Document): StockQuantityChange[] {
  const previous = quantities(before);
  const next = quantities(after);
  return [...new Set([...previous.keys(), ...next.keys()])].flatMap((key) => {
    const from = previous.get(key)?.value ?? null;
    const to = next.get(key)?.value ?? null;
    if (from === to) return [];
    const { value: _value, ...option } = next.get(key) ?? previous.get(key)!;
    return [{ ...option, before: from, after: to, delta: from == null || to == null ? null : to - from }];
  });
}

// 재고와 감사 기록은 반드시 호출자의 같은 트랜잭션에 속한다.
// 같은 작업의 게이지·색상 쓰기는 첫 before와 마지막 after로 한 이벤트에 합친다.
export async function updateProductStockWithAudit(
  db: Db,
  context: StockAuditContext,
  filter: Filter<Document>,
  update: UpdateFilter<Document>,
  options: UpdateOptions = {},
): Promise<UpdateResult<Document>> {
  if (!options.session) {
    const session = db.client.startSession();
    try {
      return await session.withTransaction(() => updateProductStockWithAudit(db, context, filter, update, { ...options, session }));
    } finally {
      await session.endSession();
    }
  }
  if (!options.session?.inTransaction()) throw new Error("STOCK_AUDIT_TRANSACTION_REQUIRED");
  const products = db.collection("products");
  const projection = { inventory: 1, variantInventories: 1, colorInventories: 1, gaugeInventories: 1 };
  const before = await products.findOne(filter, { projection, session: options.session });
  const result = await products.updateOne(filter, update, options);
  if (!result.modifiedCount || !before) return result;
  const after = await products.findOne({ _id: before._id }, { projection, session: options.session });
  if (!after) throw new Error("STOCK_AUDIT_PRODUCT_NOT_FOUND");
  if (!stockQuantityChanges(before, after).length) return result;
  const logs = db.collection("product_stock_events");
  const key = { operationId: context.operationId, productId: before._id };
  const previous = await logs.findOne(key, { session: options.session });
  const original = previous?.beforeStock ?? before;
  const changes = stockQuantityChanges(original, after);
  if (!changes.length) {
    if (previous) await logs.deleteOne({ _id: previous._id }, { session: options.session });
    return result;
  }
  const stockSnapshot = (doc: Document) => ({ inventory: { stock: doc.inventory?.stock ?? null }, variantInventories: doc.variantInventories?.map((row: Document) => ({ colorValue: row.colorValue, gaugeValue: row.gaugeValue, stock: row.stock })), colorInventories: doc.colorInventories?.map((row: Document) => ({ value: row.value, stock: row.stock })), gaugeInventories: doc.gaugeInventories?.map((row: Document) => ({ value: row.value, stock: row.stock })) });
  if (previous) {
    await logs.updateOne({ _id: previous._id }, { $set: { changes } }, { session: options.session });
  } else {
    await logs.insertOne({ _id: new ObjectId(), ...key, ...context, occurredAt: new Date(), beforeStock: stockSnapshot(before), changes }, { session: options.session });
  }
  return result;
}
