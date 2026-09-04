import Link from "next/link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { PublicAdminEditLink } from "@/components/admin/public-admin-edit-link";
import { getPublicGreeting } from "@/features/site-content/site-content.repository";
import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/about/greeting");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function GreetingPage() {
  const greeting = await getPublicGreeting().catch(() => {
    console.error("공개 인사말 조회 실패");
    return null;
  });
  const signerName = greeting?.showSignerName ? greeting.signerName.trim() : "";

  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/about"
        eyebrow="시설소개"
        title="인사말"
        description={greeting?.pageDescription ?? "시설 운영 책임자의 인사말을 전합니다."}
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "시설소개", href: "/about" }, { label: "인사말" }]}
      />
      <PublicAdminEditLink href="/admin/site-content/greeting" />
      <div className="mx-auto max-w-site px-page py-9 sm:px-page-wide sm:py-12">
        <article className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12" aria-labelledby="greeting-heading">
          {greeting ? (
            <>
              <header className="border-t-4 border-accent bg-surface-subtle p-5 sm:p-8 lg:col-span-4">
                {greeting.statusLabel.trim() ? (
                  <p className="text-safe-wrap text-small font-bold text-accent">{greeting.statusLabel}</p>
                ) : null}
                <h2
                  id="greeting-heading"
                  className="text-safe-wrap mt-3 text-[1.75rem] font-bold leading-snug sm:text-title"
                >
                  {greeting.title}
                </h2>
              </header>
              <div className="lg:col-span-7 lg:col-start-6">
                <div className="space-y-5">
                  {greeting.paragraphs.map((paragraph, index) => (
                    <p key={index} className="text-safe-wrap whitespace-pre-wrap text-body leading-8">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {greeting.signerRole.trim() || signerName ? (
                  <p className="text-safe-wrap mt-7 border-t border-border pt-5 font-semibold">
                    {greeting.signerRole}
                    {greeting.signerRole.trim() && signerName ? " · " : ""}
                    {signerName}
                  </p>
                ) : null}
                {greeting.notice.trim() ? (
                  <aside
                    aria-label="인사말 게시 안내"
                    className="text-safe-wrap mt-7 border-l-4 border-accent bg-surface-subtle px-4 py-3 text-small leading-7 text-muted-foreground"
                  >
                    {greeting.notice}
                  </aside>
                ) : null}
              </div>
            </>
          ) : (
            <div role="status" className="border-y border-border py-6 lg:col-span-8">
              <h2 id="greeting-heading" className="text-lg font-semibold">
                인사말을 불러오지 못했습니다.
              </h2>
              <p className="mt-2 text-small text-muted-foreground">잠시 후 다시 시도해 주세요.</p>
              <a href="/about/greeting" className="institution-link mt-3">
                다시 불러오기
              </a>
            </div>
          )}
          <nav
            aria-label="시설 관련 안내"
            className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 lg:col-span-7 lg:col-start-6"
          >
            <Link className="institution-link" href="/about">
              시설개요
            </Link>
            <Link className="institution-link" href="/about/directions">
              찾아오시는 길
            </Link>
          </nav>
        </article>
      </div>
    </div>
  );
}
