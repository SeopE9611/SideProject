import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "시설 소개",
};

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">샬롬의 집</h1>
      <p className="mt-6 leading-7 text-gray-700">
        시설 소개, 설립 이야기, 연혁과 운영철학을 안내할 예정입니다.
      </p>
    </section>
  );
}
