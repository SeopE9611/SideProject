import Link from "next/link";
import Image from "next/image";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import { getNewsRepository } from "@/features/news/news.repository";
import {
  getPublicNewsPaginationItems,
  normalizePublicNewsPage,
  normalizePublicNewsSearchQuery,
} from "@/features/news/news.pagination";
import { getNewsCategoryLabel, isNewsCategory, type NewsCategory } from "@/features/news/news.types";

const PAGE_SIZE = 8;
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export type NewsSearchParams = {
  q?: string | string[];
  category?: string | string[];
  page?: string | string[];
};

type NewsListPageProps = {
  basePath: "/news" | "/news/notices" | "/news/activities";
  title: string;
  description: string;
  fixedCategory?: NewsCategory;
  searchParams: Promise<NewsSearchParams>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function queryHref(basePath: NewsListPageProps["basePath"], page: number, q: string, category?: NewsCategory) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export async function NewsListPage({ basePath, title, description, fixedCategory, searchParams }: NewsListPageProps) {
  const raw = await searchParams;
  const q = normalizePublicNewsSearchQuery(first(raw.q));
  const categoryValue = first(raw.category);
  const category = fixedCategory ?? (isNewsCategory(categoryValue) ? categoryValue : undefined);
  const parsedPage = Number(first(raw.page));
  const result = await getNewsRepository()
    .searchPublished({
      q,
      category,
      page: normalizePublicNewsPage(parsedPage),
      pageSize: PAGE_SIZE,
    })
    .catch(() => {
      console.error("소식 목록 조회 실패");
      return null;
    });
  const {
    items: posts,
    total,
    totalPages,
    page: currentPage,
  } = result ?? { items: [], total: 0, totalPages: 0, page: normalizePublicNewsPage(parsedPage) };
  const hasFixture = posts.some((post) => post.isDemo);
  const categoryLabel = category ? getNewsCategoryLabel(category) : "전체";
  const hasUserFilter = Boolean(q) || (!fixedCategory && Boolean(category));
  const paginationItems = getPublicNewsPaginationItems(currentPage, totalPages);

  return (
    <div className="bg-surface">
      <SectionPageHeader
        compact
        sectionHref="/news"
        eyebrow="소식"
        title={title}
        description={description}
        breadcrumbs={[
          { label: "홈", href: "/" },
          ...(basePath !== "/news" ? [{ label: "소식", href: "/news" }] : []),
          { label: title },
        ]}
      />

      <div className="mx-auto max-w-site px-page py-8 sm:px-page-wide sm:py-12">
        <form
          key={queryHref(basePath, currentPage, q, category)}
          action={basePath}
          method="get"
          role="search"
          aria-label="소식 검색"
          className={`grid items-end gap-4 border-t-4 border-accent bg-paper p-5 sm:px-7 sm:py-6 ${
            fixedCategory
              ? "grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto]"
              : "grid-cols-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto]"
          }`}
        >
          <div className={fixedCategory ? "min-w-0" : "col-span-2 min-w-0 sm:col-span-1"}>
            <label className="block text-small font-bold" htmlFor="news-query">
              검색어
            </label>
            <input
              className="mt-2 min-h-13 w-full border border-border-strong bg-surface px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              id="news-query"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="제목 또는 요약 검색"
            />
          </div>
          {!fixedCategory ? (
            <div>
              <label className="block text-small font-bold" htmlFor="news-category">
                분류
              </label>
              <select
                className="mt-2 min-h-13 w-full border border-border-strong bg-surface px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                id="news-category"
                name="category"
                defaultValue={category ?? ""}
              >
                <option value="">전체</option>
                <option value="notice">공지사항</option>
                <option value="activity">활동 소식</option>
              </select>
            </div>
          ) : null}
          <button
            className="min-h-13 bg-primary px-7 py-3 font-bold text-primary-foreground transition-colors duration-[var(--motion-duration-fast)] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
            type="submit"
          >
            소식 검색
          </button>
        </form>

        <section aria-labelledby="results-heading" className="mt-10 sm:mt-12">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-primary pb-5">
            <div>
              <p className="text-small font-bold text-accent">게시물 찾기</p>
              <h2 id="results-heading" className="mt-2 text-xl font-bold sm:text-2xl">
                {result === null ? "소식 목록" : hasUserFilter ? "검색 결과" : "전체"}{" "}
                {result !== null ? <span className="font-bold text-accent">{total}건</span> : null}
              </h2>
              {hasUserFilter ? (
                <p className="text-safe-wrap mt-1 text-small text-muted-foreground">
                  {categoryLabel}
                  {q ? ` · “${q}”` : ""}
                </p>
              ) : null}
            </div>
            {hasUserFilter ? (
              <Link
                className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                href={basePath}
              >
                조건 초기화
              </Link>
            ) : null}
          </div>
          {hasFixture ? (
            <aside className="border-b border-border py-4 text-small text-muted-foreground">
              미리보기 · 아래 예시 소식은 레이아웃 검증용입니다.
            </aside>
          ) : null}
          {result === null ? (
            <div className="border-b border-border py-8" role="status">
              <h3 className="font-semibold">소식을 불러오지 못했습니다.</h3>
              <p className="mt-2 text-small text-muted-foreground">
                잠시 후 다시 시도해 주세요. 입력한 검색 조건은 유지됩니다.
              </p>
              <a
                className="institution-link mt-3"
                href={queryHref(basePath, currentPage, q, fixedCategory ? undefined : category)}
              >
                다시 불러오기
              </a>
            </div>
          ) : !hasUserFilter && total === 0 ? (
            <div className="border-b border-border py-10">
              <h3 className="text-safe-wrap text-heading font-bold">
                {fixedCategory === "notice"
                  ? "공지사항을 준비하고 있습니다."
                  : fixedCategory === "activity"
                    ? "활동소식을 준비하고 있습니다."
                    : "전체 게시물을 준비하고 있습니다."}
              </h3>
              <p className="text-safe-wrap mt-3 text-muted-foreground">
                {fixedCategory === "notice"
                  ? "공개된 공지사항이 아직 없습니다."
                  : fixedCategory === "activity"
                    ? "공개된 활동소식이 아직 없습니다."
                    : "공개된 게시물이 아직 없습니다."}
              </p>
              <div className="mt-5 flex flex-wrap gap-5">
                <Link className="institution-link" href="/support/contact">
                  문의하기
                </Link>
                <Link className="font-bold text-primary underline underline-offset-4" href="/">
                  홈으로 이동
                </Link>
              </div>
            </div>
          ) : total === 0 ? (
            <div className="border-b border-border py-10">
              <h3 className="text-heading font-bold">현재 조건에 맞는 소식이 없습니다.</h3>
              <p className="text-safe-wrap mt-3 text-muted-foreground">
                분류 {categoryLabel}
                {q ? `, 검색어 “${q}”` : ""}에 해당하는 결과가 없습니다.
              </p>
              <div className="mt-5">
                <Link className="font-bold text-primary underline underline-offset-4" href={basePath}>
                  조건 초기화
                </Link>
              </div>
            </div>
          ) : (
            <ul>
              {posts.map((post) => (
                <li key={post.id} className="border-b border-border">
                  <article className="grid gap-x-7 gap-y-3 py-7 md:grid-cols-[7rem_minmax(0,1fr)_9rem] md:px-2 md:py-8">
                    <div>
                      <p
                        className={`inline-flex min-h-7 items-center text-small font-bold ${post.category === "activity" ? "text-accent" : "text-primary"}`}
                      >
                        {getNewsCategoryLabel(post.category)}
                      </p>
                    </div>
                    <div className="flex min-w-0 items-start gap-5">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[1.2rem] leading-relaxed font-bold tracking-[-0.015em] sm:text-[1.35rem]">
                          <Link
                            className="text-safe-wrap underline-offset-4 hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                            href={`/news/${post.slug}?returnTo=${encodeURIComponent(queryHref(basePath, currentPage, q, fixedCategory ? undefined : category))}`}
                          >
                            {post.title}
                          </Link>
                        </h3>
                        {post.summary.trim() && post.summary.trim() !== post.title.trim() ? (
                          <p className="text-safe-wrap mt-3 max-w-3xl text-small leading-7 text-muted-foreground">
                            {post.summary}
                          </p>
                        ) : null}
                        {post.attachment ? (
                          <p className="mt-2 text-small font-semibold text-muted-foreground">PDF 첨부</p>
                        ) : null}
                      </div>
                      {post.category === "activity" && post.coverImage ? (
                        <Image
                          className="aspect-[4/3] w-24 shrink-0 object-cover sm:w-32"
                          src={post.coverImage.src}
                          alt={post.coverImage.altText}
                          width={post.coverImage.width}
                          height={post.coverImage.height}
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <time
                      className="text-small text-muted-foreground tabular-nums md:pt-1 md:text-right"
                      dateTime={post.publishedAt}
                    >
                      {dateFormatter.format(new Date(post.publishedAt))}
                    </time>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
        {totalPages > 1 ? (
          <nav aria-label="소식 페이지 이동" className="mt-9">
            <ul className="flex flex-wrap items-center justify-center gap-2">
              {currentPage > 1 ? (
                <li>
                  <Link
                    className="inline-flex min-h-11 items-center border border-border px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    href={queryHref(basePath, currentPage - 1, q, fixedCategory ? undefined : category)}
                  >
                    이전 페이지
                  </Link>
                </li>
              ) : null}
              {paginationItems.map((item) =>
                item.type === "ellipsis" ? (
                  <li key={`ellipsis-${item.position}`} aria-hidden="true">
                    <span className="inline-flex min-h-11 min-w-6 items-center justify-center">…</span>
                  </li>
                ) : (
                  <li key={item.page}>
                    {item.page === currentPage ? (
                      <span
                        aria-current="page"
                        className="inline-flex min-h-11 min-w-11 items-center justify-center border border-primary bg-primary px-3 font-bold text-primary-foreground"
                      >
                        {item.page}
                      </span>
                    ) : (
                      <Link
                        className="inline-flex min-h-11 min-w-11 items-center justify-center border border-border px-3 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                        href={queryHref(basePath, item.page, q, fixedCategory ? undefined : category)}
                        aria-label={`${item.page}페이지`}
                      >
                        {item.page}
                      </Link>
                    )}
                  </li>
                ),
              )}
              {currentPage < totalPages ? (
                <li>
                  <Link
                    className="inline-flex min-h-11 items-center border border-border px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                    href={queryHref(basePath, currentPage + 1, q, fixedCategory ? undefined : category)}
                  >
                    다음 페이지
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
