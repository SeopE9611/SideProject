import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "샬롬 소식",
};

export default function NewsPage() {
  return (
    <section className="mx-auto w-full max-w-content px-page py-section sm:px-page-wide sm:py-section-wide">
      <h1 className="text-title font-bold text-foreground">샬롬 소식</h1>
      <p className="mt-6 text-body text-muted-foreground">
        공지사항과 활동 이야기, 후원 소식을 전할 예정입니다.
      </p>
    </section>
  );
}
