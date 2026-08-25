import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";

const inputClassName =
  "mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-4 text-body text-foreground outline-none transition-colors duration-[var(--motion-duration-fast)] placeholder:text-muted-foreground focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";

export const metadata: Metadata = {
  title: "후원과 봉사",
  description:
    "샬롬의 집 후원과 자원봉사 참여 방법, 문의 전 준비할 내용을 안내합니다.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-page py-10 sm:px-page-wide sm:py-14">
      <nav aria-label="현재 위치" className="text-small text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              홈
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="font-bold text-foreground">
            후원과 봉사
          </li>
        </ol>
      </nav>

      <header className="mt-8 border-b border-border pb-10 sm:pb-12">
        <p className="text-small font-bold text-primary">함께 만드는 일상</p>
        <h1 className="mt-3 text-display font-bold text-foreground sm:text-display-lg">
          후원과 봉사로 함께해 주세요
        </h1>
        <p className="mt-5 max-w-content text-body text-muted-foreground">
          보내 주시는 관심은 거주인의 편안한 일상과 다양한 활동을 이어 가는
          힘이 됩니다. 참여 전 궁금한 점은 시설 대표 전화로 편하게 문의해
          주세요.
        </p>
      </header>

      <div>
        <section
          aria-labelledby="support-heading"
          className="py-section sm:py-section-wide"
        >
          <p className="text-small font-bold text-primary">후원 안내</p>
          <h2 id="support-heading" className="mt-2 text-title font-bold">
            후원 방법을 먼저 확인해 주세요
          </h2>
          <div className="mt-6 rounded-card border border-border bg-primary-soft p-6 sm:p-8">
            <h3 className="text-heading font-bold">안전한 후원 정보 확인</h3>
            <p className="mt-3 text-body text-muted-foreground">
              후원 계좌와 사용 목적은 정확한 안내를 위해 담당자 확인 후
              전달합니다. 홈페이지에 확인되지 않은 계좌로는 송금하지 마세요.
            </p>
            <a
              href={`tel:${siteConfig.phone}`}
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-control bg-primary px-6 font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              후원 계좌 전화로 확인하기
            </a>
            <p className="mt-3 text-small text-muted-foreground">
              시설 대표 전화 {siteConfig.phone}
            </p>
          </div>
        </section>

        <section
          aria-labelledby="volunteer-form-heading"
          className="border-t border-border py-section sm:py-section-wide"
        >
          <p className="text-small font-bold text-primary">자원봉사 신청</p>
          <h2 id="volunteer-form-heading" className="mt-2 text-title font-bold">
            가능한 활동을 함께 찾아보세요
          </h2>
          <p id="volunteer-form-help" className="mt-4 text-body text-muted-foreground">
            아래 항목은 신청할 때 필요한 기본 정보입니다. 온라인 접수 기능을
            준비하고 있어, 현재는 내용을 확인한 뒤 대표 전화로 신청해 주세요.
          </p>

          <form
            aria-describedby="volunteer-form-help volunteer-form-status"
            className="mt-8 space-y-6 rounded-card border border-border bg-surface p-6 shadow-card sm:p-8"
          >
            <div>
              <label htmlFor="volunteer-name" className="font-bold">
                신청자 이름 <span aria-hidden="true" className="text-danger">*</span>
              </label>
              <input
                id="volunteer-name"
                name="volunteerName"
                type="text"
                autoComplete="name"
                required
                aria-invalid="false"
                aria-describedby="volunteer-name-help"
                className={inputClassName}
              />
              <p id="volunteer-name-help" className="mt-2 text-small text-muted-foreground">
                담당자가 부를 수 있는 이름을 입력해 주세요.
              </p>
            </div>

            <div>
              <label htmlFor="volunteer-phone" className="font-bold">
                연락처 <span aria-hidden="true" className="text-danger">*</span>
              </label>
              <input
                id="volunteer-phone"
                name="volunteerPhone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                aria-invalid="false"
                aria-describedby="volunteer-phone-help"
                className={inputClassName}
              />
              <p id="volunteer-phone-help" className="mt-2 text-small text-muted-foreground">
                연락 가능한 전화번호를 입력해 주세요.
              </p>
            </div>

            <div>
              <label htmlFor="volunteer-interest" className="font-bold">
                희망 활동 또는 문의 내용
              </label>
              <textarea
                id="volunteer-interest"
                name="volunteerInterest"
                rows={5}
                aria-invalid="false"
                aria-describedby="volunteer-interest-help"
                className={inputClassName}
              />
              <p id="volunteer-interest-help" className="mt-2 text-small text-muted-foreground">
                가능한 요일과 시간, 관심 있는 활동을 적어 주세요.
              </p>
            </div>

            <div
              id="volunteer-form-status"
              role="status"
              className="rounded-control bg-warning-soft p-4 text-small text-warning"
            >
              온라인 접수는 준비 중입니다. 입력한 정보는 전송되지 않으므로,
              아래 버튼으로 전화해 신청을 마무리해 주세요.
            </div>
            <a
              href={`tel:${siteConfig.phone}`}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-6 text-center font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:w-auto"
            >
              전화로 봉사활동 신청하기
            </a>
          </form>
        </section>

        <section
          aria-labelledby="inquiry-form-heading"
          className="border-t border-border py-section sm:py-section-wide"
        >
          <p className="text-small font-bold text-primary">후원 문의</p>
          <h2 id="inquiry-form-heading" className="mt-2 text-title font-bold">
            문의할 내용을 미리 정리해 보세요
          </h2>
          <form className="mt-8 space-y-6 rounded-card border border-border bg-surface p-6 sm:p-8">
            <div>
              <label htmlFor="supporter-name" className="font-bold">
                문의자 이름
              </label>
              <input
                id="supporter-name"
                name="supporterName"
                type="text"
                autoComplete="name"
                aria-invalid="false"
                aria-describedby="supporter-name-help"
                className={inputClassName}
              />
              <p id="supporter-name-help" className="mt-2 text-small text-muted-foreground">
                오류가 있으면 이 안내 영역에 원인과 해결 방법을 함께 표시합니다.
              </p>
            </div>
            <div>
              <label htmlFor="support-question" className="font-bold">
                후원 문의 내용
              </label>
              <textarea
                id="support-question"
                name="supportQuestion"
                rows={5}
                aria-invalid="false"
                aria-describedby="support-question-help"
                className={inputClassName}
              />
              <p id="support-question-help" className="mt-2 text-small text-muted-foreground">
                정기 후원, 물품 후원 등 궁금한 내용을 적어 주세요.
              </p>
            </div>
            <a
              href={`tel:${siteConfig.phone}`}
              className="inline-flex min-h-12 w-full items-center justify-center rounded-control border border-primary bg-surface px-6 text-center font-bold text-primary transition-colors duration-[var(--motion-duration-fast)] hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:w-auto"
            >
              전화로 후원 문의하기
            </a>
          </form>
        </section>
      </div>
    </div>
  );
}
