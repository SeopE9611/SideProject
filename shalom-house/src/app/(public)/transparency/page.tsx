import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "투명한 운영",
};

export default function TransparencyPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">투명한 운영</h1>
      <p className="mt-6 leading-7 text-gray-700">
        사업보고와 후원금 사용보고 등 공개 가능한 운영자료를 안내할 예정입니다.
      </p>
    </section>
  );
}
