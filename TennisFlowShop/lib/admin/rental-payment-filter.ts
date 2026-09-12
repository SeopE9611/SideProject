const PAID_PAYMENT_TOKENS = ["paid", "confirmed", "paymentcompleted", "결제완료"];

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
}

export function isRentalPaymentPaidForFilter(rental: any): boolean {
  const direct = normalizeToken(rental?.paymentStatus);
  const nested = normalizeToken(rental?.paymentInfo?.status);
  const explicit = direct || nested;
  if (explicit) return PAID_PAYMENT_TOKENS.includes(explicit);

  const rentalStatus = normalizeToken(rental?.status);
  return (
    ["paid", "out", "returned"].includes(rentalStatus) ||
    Boolean(rental?.payment?.paidAt || rental?.paidAt)
  );
}

function mongoToken(field: string) {
  return {
    $replaceAll: {
      input: {
        $replaceAll: {
          input: {
            $replaceAll: {
              input: {
                $toLower: {
                  $trim: {
                    input: {
                      $cond: [{ $eq: [{ $type: field }, "string"] }, field, ""],
                    },
                  },
                },
              },
              find: " ",
              replacement: "",
            },
          },
          find: "_",
          replacement: "",
        },
      },
      find: "-",
      replacement: "",
    },
  };
}

export function buildRentalPaymentPaidExpression() {
  return {
    $let: {
      vars: {
        direct: mongoToken("$paymentStatus"),
        nested: mongoToken("$paymentInfo.status"),
        rentalStatus: mongoToken("$status"),
      },
      in: {
        $cond: [
          { $ne: ["$$direct", ""] },
          { $in: ["$$direct", PAID_PAYMENT_TOKENS] },
          {
            $cond: [
              { $ne: ["$$nested", ""] },
              { $in: ["$$nested", PAID_PAYMENT_TOKENS] },
              {
                $or: [
                  { $in: ["$$rentalStatus", ["paid", "out", "returned"]] },
                  { $ne: [{ $ifNull: ["$payment.paidAt", null] }, null] },
                  { $ne: [{ $ifNull: ["$paidAt", null] }, null] },
                ],
              },
            ],
          },
        ],
      },
    },
  };
}

export function buildRentalPaymentFilterExpression(kind: "paid" | "unpaid") {
  const paidExpression = buildRentalPaymentPaidExpression();
  return kind === "paid" ? paidExpression : { $not: [paidExpression] };
}
