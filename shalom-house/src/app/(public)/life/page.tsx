import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "함께하는 생활",
};

export default function LifePage() {
  return (
    <section className="mx-auto w-full max-w-content px-page py-section sm:px-page-wide sm:py-section-wide">
      <h1 className="text-title font-bold text-foreground">함께하는 생활</h1>
      <p className="mt-6 text-body text-muted-foreground">
        생활지원과 교육, 여가 및 지역사회 활동을 소개할 예정입니다.
      </p>
    </section>
  );
}
