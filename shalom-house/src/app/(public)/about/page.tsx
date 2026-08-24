import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "시설 소개",
};

export default function AboutPage() {
  return (
    <section className="mx-auto w-full max-w-content px-page py-section sm:px-page-wide sm:py-section-wide">
      <h1 className="text-title font-bold text-foreground">샬롬의 집</h1>
      <p className="mt-6 text-body text-muted-foreground">
        시설 소개, 설립 이야기, 연혁과 운영철학을 안내할 예정입니다.
      </p>
    </section>
  );
}
