export function SkipLink() {
  return (
    <a
      className="sr-only z-50 rounded-control bg-surface px-4 py-3 text-foreground underline shadow-card focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
      href="#main-content"
    >
      본문 바로가기
    </a>
  );
}
