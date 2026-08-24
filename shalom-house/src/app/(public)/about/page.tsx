import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

const aboutRelatedDescriptions: Partial<
  Record<(typeof siteConfig.mainNavigation)[number]["href"], string>
> = {
  "/life": "생활과 프로그램 안내를 확인합니다.",
  "/news": "공지사항과 활동 소식을 확인합니다.",
  "/support": "후원과 자원봉사 참여 정보를 확인합니다.",
  "/transparency": "공개가 승인된 운영 자료를 확인합니다.",
} satisfies Partial<
  Record<(typeof siteConfig.mainNavigation)[number]["href"], string>
>;

export const metadata: Metadata = {
  title: "시설 소개",
  description: "샬롬의 집의 기본 정보와 공개 홈페이지 안내를 확인합니다.",
};

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border bg-surface-subtle">
        <div className="mx-auto grid w-full max-w-site items-center gap-10 px-page py-16 sm:px-page-wide sm:py-20 lg:min-h-[32rem] lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <div>
            <p className="inline-flex rounded-full border border-border bg-surface px-4 py-2 text-small font-semibold text-primary">
              시설 소개
            </p>
            <h1 className="mt-6 max-w-3xl text-display font-bold text-foreground sm:text-display-lg">
              샬롬의 집을 소개합니다
            </h1>
            <div className="mt-6 max-w-2xl space-y-3 text-body text-muted-foreground">
              <p>{siteConfig.description}</p>
              <p>
                현재 확인 가능한 기본 정보와 홈페이지의 주요 안내 경로를
                제공합니다.
              </p>
            </div>
          </div>

          <aside
            aria-labelledby="about-basic-info-heading"
            className="rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
          >
            <p className="text-small font-bold text-primary">기본 정보</p>
            <h2
              id="about-basic-info-heading"
              className="mt-2 text-heading font-bold text-foreground"
            >
              시설 연락 안내
            </h2>
            <address className="mt-6 not-italic">
              <dl className="space-y-5">
                <div>
                  <dt className="text-small font-bold text-foreground">
                    시설명
                  </dt>
                  <dd className="mt-1 text-body text-muted-foreground">
                    {siteConfig.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-small font-bold text-foreground">주소</dt>
                  <dd className="mt-1 text-body text-muted-foreground">
                    {siteConfig.address}
                  </dd>
                </div>
                <div>
                  <dt className="text-small font-bold text-foreground">
                    대표 전화
                  </dt>
                  <dd className="mt-1 text-body text-muted-foreground">
                    <a
                      className="inline-flex rounded-control text-primary underline underline-offset-4 transition-colors duration-[var(--motion-duration-fast)] ease-standard hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                      href={`tel:${siteConfig.phone}`}
                    >
                      {siteConfig.phone}
                    </a>
                  </dd>
                </div>
              </dl>
            </address>
          </aside>
        </div>
      </section>

      <section
        aria-labelledby="about-related-heading"
        className="mx-auto w-full max-w-site px-page py-section sm:px-page-wide sm:py-section-wide"
      >
        <p className="text-small font-bold text-primary">홈페이지 안내</p>
        <h2
          id="about-related-heading"
          className="mt-2 text-title font-bold text-foreground"
        >
          샬롬의 집 정보를 더 살펴보세요
        </h2>
        <p className="mt-4 max-w-2xl text-body text-muted-foreground">
          생활과 프로그램, 소식, 참여 방법과 공개 운영 자료를 메뉴별로 확인할 수
          있습니다.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {siteConfig.mainNavigation.map((item) => {
            const description = aboutRelatedDescriptions[item.href];

            if (!description) {
              return null;
            }

            const isSupport = item.href === "/support";

            return (
              <Link
                key={item.href}
                className={`group flex min-h-44 flex-col justify-between rounded-card border p-6 transition-colors duration-[var(--motion-duration-standard)] ease-standard focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring ${
                  isSupport
                    ? "border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover"
                    : "border-border bg-surface text-foreground hover:border-primary hover:bg-primary-soft"
                }`}
                href={item.href}
              >
                <div>
                  <h3
                    className={`text-heading font-bold ${
                      isSupport
                        ? "text-primary-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </h3>
                  <p
                    className={`mt-4 text-body ${
                      isSupport
                        ? "text-primary-foreground opacity-90"
                        : "text-muted-foreground"
                    }`}
                  >
                    {description}
                  </p>
                </div>
                <span className="mt-8 inline-flex items-center gap-2 text-small font-bold">
                  안내 보기
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="about-information-policy-heading"
        className="mx-auto w-full max-w-site px-page pb-section sm:px-page-wide sm:pb-section-wide"
      >
        <div className="rounded-card border border-border bg-primary-soft p-6 sm:p-8">
          <p className="text-small font-bold text-primary">정보 공개 원칙</p>
          <h2
            id="about-information-policy-heading"
            className="mt-2 text-heading font-bold text-foreground"
          >
            확인된 정보를 바탕으로 안내합니다
          </h2>
          <div className="mt-4 max-w-3xl space-y-3 text-body text-muted-foreground">
            <p>
              시설의 연혁, 운영 방향, 시설 환경 등 상세 소개는 담당자 확인과 공개
              범위 검토를 거쳐 순차적으로 안내합니다.
            </p>
            <p>
              사진과 관계자 정보는 공개 동의와 검수를 거친 자료만 사용합니다.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
