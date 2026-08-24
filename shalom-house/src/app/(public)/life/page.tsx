import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "함께하는 생활",
};

export default function LifePage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">함께하는 생활</h1>
      <p className="mt-6 leading-7 text-gray-700">
        생활지원과 교육, 여가 및 지역사회 활동을 소개할 예정입니다.
      </p>
    </section>
  );
}
