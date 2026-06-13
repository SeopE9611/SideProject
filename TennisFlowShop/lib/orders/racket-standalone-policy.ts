const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

function parseBooleanFlag(value: string | undefined): boolean {
  return ENABLED_VALUES.has(
    String(value ?? "")
      .trim()
      .toLowerCase(),
  );
}

export const ENABLE_RACKET_STANDALONE_ORDER = parseBooleanFlag(
  process.env.NEXT_PUBLIC_ENABLE_RACKET_STANDALONE_ORDER ??
    process.env.ENABLE_RACKET_STANDALONE_ORDER ??
    "false",
);

export const RACKET_STANDALONE_ORDER_DISABLED_RESPONSE = {
  success: false,
  code: "RACKET_STANDALONE_ORDER_DISABLED",
  message:
    "라켓 단품구매는 현재 운영하지 않습니다. 스트링 선택 후 교체서비스 포함 주문으로 진행해주세요.",
} as const;
