export function SkipLink() {
  return (
    <a
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:border focus:border-border-strong focus:bg-primary-soft focus:px-4 focus:py-3 focus:font-bold focus:text-foreground focus:underline focus:shadow-card focus:outline-2 focus:outline-offset-2 focus:outline-focus-ring"
      href="#main-content"
    >
      본문 바로가기
    </a>
  );
}
