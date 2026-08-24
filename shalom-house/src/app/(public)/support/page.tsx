import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "후원과 봉사",
};

export default function SupportPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">후원과 봉사</h1>
      <p className="mt-6 leading-7 text-gray-700">
        후원 방법과 봉사 참여 절차를 안내할 예정입니다.
      </p>
    </section>
  );
}
