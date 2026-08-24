import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "투명한 운영",
};

export default function TransparencyPage() {
  return (
    <section className="mx-auto w-full max-w-content px-page py-section sm:px-page-wide sm:py-section-wide">
      <h1 className="text-title font-bold text-foreground">투명한 운영</h1>
      <p className="mt-6 text-body text-muted-foreground">
        사업보고와 후원금 사용보고 등 공개 가능한 운영자료를 안내할 예정입니다.
      </p>
    </section>
  );
}
