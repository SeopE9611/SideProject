import Link from "next/link";
import { SectionPageHeader } from "@/components/layout/section-page-header";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import { findPublicTransparencyDocuments } from "@/features/transparency/transparency.repository";
import {
  isTransparencyCategory,
  transparencyCategories,
  transparencyCategoryLabels,
} from "@/features/transparency/transparency.types";

export const metadata = createPublicPageMetadata("/transparency");
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = { category?: string | string[]; period?: string | string[] };
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

export default async function TransparencyPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [raw, documents] = await Promise.all([
    searchParams,
    findPublicTransparencyDocuments().catch(() => {
      console.error("공개 자료 목록 조회 실패");
      return null;
    }),
  ]);
  const categoryValue = first(raw.category);
  const category = isTransparencyCategory(categoryValue) ? categoryValue : "";
  const period = (first(raw.period) ?? "").trim().slice(0, 100);
  const periods = Array.from(new Set((documents ?? []).map((document) => document.periodLabel)));
  const filtered = (documents ?? []).filter(
    (document) => (!category || document.category === category) && (!period || document.periodLabel === period),
  );
  const hasFilter = Boolean(category || period);
  const retryParams = new URLSearchParams();
  if (category) retryParams.set("category", category);
  if (period) retryParams.set("period", period);
  const retryHref = retryParams.size ? "/transparency?" + retryParams.toString() : "/transparency";

  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/news"
        eyebrow="소식"
        title="자료공개"
        description="운영 보고, 예산·결산, 후원금 자료를 분류와 기준 기간별로 확인합니다."
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "소식", href: "/news" }, { label: "자료공개" }]}
      />
      <div className="mx-auto max-w-site px-page py-9 sm:px-page-wide sm:py-12">
        <form
          key={retryHref}
          action="/transparency"
          method="get"
          role="search"
          aria-label="공개 자료 찾기"
          className="grid grid-cols-2 items-end gap-4 border-t-4 border-accent bg-surface-subtle p-5 sm:grid-cols-[14rem_minmax(0,1fr)_auto] sm:p-6"
        >
          <div className="min-w-0">
            <label className="block text-small font-semibold" htmlFor="document-category">
              자료 분류
            </label>
            <select
              id="document-category"
              name="category"
              defaultValue={category}
              className="mt-2 min-h-12 w-full min-w-0 rounded-control border border-border-strong bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <option value="">전체</option>
              {transparencyCategories.map((item) => (
                <option key={item} value={item}>
                  {transparencyCategoryLabels[item]}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="block text-small font-semibold" htmlFor="document-period">
              기준 기간
            </label>
            <select
              id="document-period"
              name="period"
              defaultValue={period}
              className="mt-2 min-h-12 w-full min-w-0 rounded-control border border-border-strong bg-surface px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              <option value="">전체</option>
              {period && !periods.includes(period) ? <option value={period}>{period}</option> : null}
              {periods.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="col-span-2 min-h-12 rounded-control bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:col-span-1"
          >
            자료 찾기
          </button>
        </form>
        <section id="public-documents" aria-labelledby="documents-heading" className="mt-9">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-foreground pb-4">
            <div className="min-w-0">
              <p className="text-small font-bold text-accent">문서 목록</p>
              <h2 id="documents-heading" className="mt-1 text-heading font-bold">
                {documents === null ? "공개 자료" : hasFilter ? "검색 결과" : "전체 자료"}{" "}
                {documents !== null ? <span className="text-primary">{filtered.length}건</span> : null}
              </h2>
              {hasFilter ? (
                <p className="text-safe-wrap mt-1 text-small text-muted-foreground">
                  {category ? transparencyCategoryLabels[category] : "전체 분류"}
                  {period ? " · " + period : ""}
                </p>
              ) : null}
            </div>
            {hasFilter ? (
              <Link className="institution-link text-small" href="/transparency">
                조건 초기화
              </Link>
            ) : null}
          </div>
          {documents === null ? (
            <div className="border-b border-border py-6" role="status">
              <h3 className="font-semibold">자료를 불러오지 못했습니다.</h3>
              <p className="mt-2 text-small text-muted-foreground">
                잠시 후 다시 시도해 주세요. 선택한 조건은 유지됩니다.
              </p>
              <a className="institution-link mt-3" href={retryHref}>
                다시 불러오기
              </a>
            </div>
          ) : filtered.length === 0 ? (
            <div className="border-b border-border py-6">
              <h3 className="text-safe-wrap font-semibold">
                {hasFilter ? "선택한 조건에 맞는 자료가 없습니다." : "현재 공개된 운영 자료가 없습니다."}
              </h3>
              <p className="text-safe-wrap mt-2 text-small text-muted-foreground">
                {hasFilter
                  ? "조건을 바꾸거나 전체 자료를 확인해 주세요."
                  : "새로운 자료가 게시되면 이 목록에서 안내합니다."}
              </p>
              <Link className="institution-link mt-3" href={hasFilter ? "/transparency" : "/support/contact"}>
                {hasFilter ? "전체 자료 보기" : "자료 문의하기"}
              </Link>
            </div>
          ) : (
            <ul className="border-b border-border">
              {filtered.map((document) => (
                <li
                  key={document.slug}
                  className="grid min-w-0 gap-4 border-b border-border py-6 last:border-b-0 lg:grid-cols-[7rem_minmax(0,1fr)_13rem] lg:gap-7"
                >
                  <p className="text-small font-bold text-accent">{transparencyCategoryLabels[document.category]}</p>
                  <article className="min-w-0">
                    <h3 className="text-safe-wrap text-[1.2rem] font-bold leading-7">{document.title}</h3>
                    {document.summary.trim() && document.summary.trim() !== document.title.trim() ? (
                      <p className="text-safe-wrap mt-2 text-small leading-7 text-muted-foreground">
                        {document.summary}
                      </p>
                    ) : null}
                    <dl className="mt-4 grid gap-x-6 gap-y-3 text-small sm:grid-cols-3">
                      <div className="min-w-0 border-l border-border pl-3">
                        <dt className="text-muted-foreground">기준 기간</dt>
                        <dd className="text-safe-wrap mt-1 font-medium">{document.periodLabel}</dd>
                      </div>
                      <div className="border-l border-border pl-3">
                        <dt className="text-muted-foreground">문서일</dt>
                        <dd className="mt-1 font-medium">
                          <time dateTime={document.documentDate}>{document.documentDate.replace(/-/g, ".")}</time>
                        </dd>
                      </div>
                      <div className="border-l border-border pl-3">
                        <dt className="text-muted-foreground">게시일</dt>
                        <dd className="mt-1 font-medium">
                          <time dateTime={document.publishedAt}>
                            {dateFormatter.format(new Date(document.publishedAt))}
                          </time>
                        </dd>
                      </div>
                    </dl>
                  </article>
                  <div className="border-t border-border pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
                    <p className="text-small font-medium text-muted-foreground">
                      {document.fileType} ·{" "}
                      {document.byteSize >= 1024 * 1024
                        ? (document.byteSize / 1024 / 1024).toFixed(1) + " MB"
                        : Math.ceil(document.byteSize / 1024) + " KB"}
                    </p>
                    <a
                      className="mt-3 inline-flex min-h-11 items-center justify-center rounded-control border border-primary px-4 py-2 font-semibold text-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
                      href={"/api/transparency/" + document.slug + "/document"}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={document.title + " PDF 열기 (새 창)"}
                    >
                      PDF 열기 <span className="text-xs">(새 창)</span>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <aside
          aria-label="자료 이용 안내"
          className="mt-8 border-l-4 border-accent bg-accent-soft px-5 py-4 text-small text-muted-foreground"
        >
          <p className="text-safe-wrap">
            PDF를 읽기 어렵거나 자료에 관해 궁금한 점이 있으면{" "}
            <Link className="institution-link" href="/support/contact">
              문의해 주세요.
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
