import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto w-full max-w-content px-page py-section sm:px-page-wide sm:py-section-wide">
      <h1 className="text-title font-bold text-foreground">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-6 text-body text-muted-foreground">
        요청하신 페이지가 없거나 주소가 변경되었습니다.
      </p>
      <Link
        className="mt-8 inline-block font-semibold text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
        href="/"
      >
        홈으로 이동
      </Link>
    </section>
  );
}
