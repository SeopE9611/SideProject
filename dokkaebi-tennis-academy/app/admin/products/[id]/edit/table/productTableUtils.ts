export function parseSearchKeywordsInput(input: string) {
  return input
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
}
