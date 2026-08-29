import Link from "next/link";

import { SectionLocalNavigation } from "@/components/layout/section-local-navigation";
import { siteConfig } from "@/config/site";
import { getNewsRepository } from "@/features/news/news.repository";
import {
  getPublicNewsPaginationItems,
  normalizePublicNewsPage,
  normalizePublicNewsSearchQuery,
} from "@/features/news/news.pagination";
import {
  getNewsCategoryLabel,
  isNewsCategory,
  type NewsCategory,
} from "@/features/news/news.types";

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

function queryHref(
  basePath: NewsListPageProps["basePath"],
  page: number,
  q: string,
  category?: NewsCategory,
) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export async function NewsListPage({
  basePath,
  title,
  description,
  fixedCategory,
  searchParams,
}: NewsListPageProps) {
  const raw = await searchParams;
  const q = normalizePublicNewsSearchQuery(first(raw.q));
  const categoryValue = first(raw.category);
  const category = fixedCategory ?? (isNewsCategory(categoryValue) ? categoryValue : undefined);
  const parsedPage = Number(first(raw.page));
  const result = await getNewsRepository().searchPublished({
    q,
    category,
    page: normalizePublicNewsPage(parsedPage),
    pageSize: PAGE_SIZE,
  });
  const { items: posts, total, totalPages, page: currentPage } = result;
  const hasFixture = posts.some((post) => post.isDemo);
  const categoryLabel = category ? getNewsCategoryLabel(category) : "전체";
  const hasUserFilter = Boolean(q) || (!fixedCategory && Boolean(category));
  const paginationItems = getPublicNewsPaginationItems(
    currentPage,
    totalPages,
  );

  return (
    <div className="bg-surface">
      <header className="border-b border-border">
        <div className="mx-auto max-w-site px-page py-10 sm:px-page-wide sm:py-14">
          <nav aria-label="breadcrumb" className="flex flex-wrap gap-3 text-small">
            <Link
              className="text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              href="/"
            >
              홈
            </Link>
            {basePath !== "/news" ? (
              <Link
                className="text-primary underline underline-offset-4"
                href="/news"
              >
                소식
              </Link>
            ) : null}
            <span aria-current="page">{title}</span>
          </nav>
          <p className="mt-7 text-small font-bold text-accent">소식</p>
          <div className="mt-2">
            <h1 className="text-safe-wrap text-title font-bold sm:text-[2.5rem]">{title}</h1>
            <p className="text-safe-wrap mt-3 max-w-2xl text-body text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <SectionLocalNavigation sectionHref="/news" />
      </header>

      <div className="mx-auto max-w-site px-page py-10 sm:px-page-wide sm:py-14">
        <form
          action={basePath}
          method="get"
          className={`grid gap-5 border border-border bg-surface-subtle p-5 md:items-end ${
            fixedCategory
              ? "md:grid-cols-[minmax(0,1fr)_auto]"
              : "md:grid-cols-[minmax(0,1fr)_14rem_auto]"
          }`}
        >
          <div>
            <label className="block text-small font-bold" htmlFor="news-query">
              검색어
            </label>
            <input
              className="mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
              id="news-query"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="제목 또는 요약 검색"
            />
          </div>
          {!fixedCategory ? (
            <div>
              <label
                className="block text-small font-bold"
                htmlFor="news-category"
              >
                분류
              </label>
              <select
                className="mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
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
            className="min-h-12 bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring"
            type="submit"
          >
            소식 검색
          </button>
        </form>

        <section aria-labelledby="results-heading" className="mt-9">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-5">
            <div>
              <h2 id="results-heading" className="text-heading font-bold">
                검색 결과
              </h2>
              <p className="text-safe-wrap mt-2 text-small text-muted-foreground">
                적용 분류: {categoryLabel}
                {q ? ` · 검색어: “${q}”` : " · 검색어 없음"} · 전체 {total}건
              </p>
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
            <aside className="mt-5 border-l-4 border-primary bg-primary-soft px-4 py-3 text-small">
              현재 표시된 게시물은 공식 시설 소식이 아닙니다.
            </aside>
          ) : null}
          {!hasUserFilter && total === 0 ? (
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
                <a
                  className="font-bold text-primary underline underline-offset-4"
                  href={siteConfig.instagram}
                  target="_blank"
                  rel="noreferrer"
                >
                  인스타그램 보기(새 창)
                </a>
                <Link
                  className="font-bold text-primary underline underline-offset-4"
                  href="/"
                >
                  홈으로 이동
                </Link>
              </div>
            </div>
          ) : total === 0 ? (
            <div className="border-b border-border py-10">
              <h3 className="text-heading font-bold">
                현재 조건에 맞는 소식이 없습니다.
              </h3>
              <p className="text-safe-wrap mt-3 text-muted-foreground">
                분류 {categoryLabel}
                {q ? `, 검색어 “${q}”` : ""}에 해당하는 결과가 없습니다.
              </p>
              <div className="mt-5">
                <Link
                  className="font-bold text-primary underline underline-offset-4"
                  href={basePath}
                >
                  조건 초기화
                </Link>
              </div>
            </div>
          ) : (
            <ul>
              {posts.map((post) => (
                <li key={post.id} className="border-b border-border">
                  <article className="grid gap-3 py-6 md:grid-cols-[8rem_minmax(0,1fr)_10rem]">
                    <div>
                      <p className="text-small font-bold text-primary">
                        {getNewsCategoryLabel(post.category)}
                      </p>
                      {post.isDemo ? (
                        <p className="mt-1 text-xs text-muted-foreground">시연 콘텐츠</p>
                      ) : null}
                    </div>
                    <div>
                      <h3 className="text-heading font-bold">
                        <Link
                          className="text-safe-wrap underline decoration-border-strong underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                          href={`/news/${post.slug}`}
                        >
                          {post.title}
                        </Link>
                      </h3>
                      <p className="text-safe-wrap mt-2 text-body text-muted-foreground">
                        {post.summary}
                      </p>
                    </div>
                    <time
                      className="text-small text-muted-foreground md:text-right"
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
                    href={queryHref(
                      basePath,
                      currentPage - 1,
                      q,
                      fixedCategory ? undefined : category,
                    )}
                  >
                    이전 페이지
                  </Link>
                </li>
              ) : null}
              {paginationItems.map((item) =>
                item.type === "ellipsis" ? (
                  <li key={`ellipsis-${item.position}`} aria-hidden="true">
                    <span className="inline-flex min-h-11 min-w-6 items-center justify-center">
                      …
                    </span>
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
                        href={queryHref(
                          basePath,
                          item.page,
                          q,
                          fixedCategory ? undefined : category,
                        )}
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
                    href={queryHref(
                      basePath,
                      currentPage + 1,
                      q,
                      fixedCategory ? undefined : category,
                    )}
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
