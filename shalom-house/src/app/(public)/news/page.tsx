import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "샬롬 소식",
};

export default function NewsPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">샬롬 소식</h1>
      <p className="mt-6 leading-7 text-gray-700">
        공지사항과 활동 이야기, 후원 소식을 전할 예정입니다.
      </p>
    </section>
  );
}
