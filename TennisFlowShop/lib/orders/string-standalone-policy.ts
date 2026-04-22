const ENABLED_VALUES = new Set(["1", "true", "yes", "on"]);

function parseBooleanFlag(value: string | undefined): boolean {
  return ENABLED_VALUES.has(String(value ?? "").trim().toLowerCase());
}

export const ENABLE_STRING_STANDALONE_ORDER = parseBooleanFlag(
  process.env.NEXT_PUBLIC_ENABLE_STRING_STANDALONE_ORDER ??
    process.env.ENABLE_STRING_STANDALONE_ORDER ??
    "false",
);
