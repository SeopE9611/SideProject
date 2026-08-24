import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">
        페이지를 찾을 수 없습니다
      </h1>
      <p className="mt-6 leading-7 text-gray-700">
        요청하신 페이지가 없거나 주소가 변경되었습니다.
      </p>
      <Link
        className="mt-8 inline-block font-semibold text-gray-950 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
        href="/"
      >
        홈으로 이동
      </Link>
    </section>
  );
}
