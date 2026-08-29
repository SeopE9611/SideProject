import type { Metadata } from "next";
import Link from "next/link";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { siteConfig } from "@/config/site";
import { supportFixture } from "@/content/fixtures/support.fixture";

export const metadata: Metadata = {
  title: "문의하기",
};

export default function ContactPage() {
  return (
    <>
      <SectionPageHeader
        sectionHref="/support"
        eyebrow="함께하기"
        title="문의하기"
        description="현재 공식 설정에서 확인된 연락 경로만 안내합니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "함께하기", href: "/support" },
          { label: "문의하기" },
        ]}
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        <h2 className="text-heading font-bold">문의 경로</h2>
        <p className="mt-5 text-small text-muted-foreground">
          확인된 경로: {supportFixture.contactPaths.join(", ")}
        </p>
        <dl className="mt-5 divide-y divide-border border-y">
          <div className="grid gap-2 py-5 sm:grid-cols-3">
            <dt className="font-bold">대표 전화</dt>
            <dd className="sm:col-span-2">
              <a
                className="text-primary underline"
                href={`tel:${siteConfig.phone}`}
              >
                {siteConfig.phone}
              </a>
            </dd>
          </div>
          <div className="grid gap-2 py-5 sm:grid-cols-3">
            <dt className="font-bold">주소</dt>
            <dd className="text-safe-wrap sm:col-span-2">
              {siteConfig.address}
            </dd>
          </div>
          <div className="grid gap-2 py-5 sm:grid-cols-3">
            <dt className="font-bold">찾아오시는 길</dt>
            <dd className="sm:col-span-2">
              <Link className="text-primary underline" href="/about/directions">
                방문 안내 보기
              </Link>
            </dd>
          </div>
          <div className="grid gap-2 py-5 sm:grid-cols-3">
            <dt className="font-bold">인스타그램</dt>
            <dd className="sm:col-span-2">
              <a
                className="text-safe-wrap text-primary underline"
                href={siteConfig.instagram}
                target="_blank"
                rel="noreferrer"
              >
                공식 인스타그램 보기(새 창)
              </a>
            </dd>
          </div>
        </dl>
      </section>
    </>
  );
}
