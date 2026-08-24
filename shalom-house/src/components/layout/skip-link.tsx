export function SkipLink() {
  return (
    <a
      className="sr-only z-50 rounded-sm bg-white px-4 py-3 text-gray-950 underline shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:outline-2 focus:outline-offset-2"
      href="#main-content"
    >
      본문 바로가기
    </a>
  );
}
