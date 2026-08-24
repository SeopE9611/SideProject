import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "후원과 봉사",
};

export default function SupportPage() {
  return (
    <section className="mx-auto w-full max-w-content px-page py-section sm:px-page-wide sm:py-section-wide">
      <h1 className="text-title font-bold text-foreground">후원과 봉사</h1>
      <p className="mt-6 text-body text-muted-foreground">
        후원 방법과 봉사 참여 절차를 안내할 예정입니다.
      </p>
    </section>
  );
}
