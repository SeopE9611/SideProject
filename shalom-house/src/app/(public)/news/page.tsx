import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { getNewsRepository } from "@/features/news/news.repository";
import { getNewsCategoryLabel, isNewsCategory, type NewsCategory } from "@/features/news/news.types";

export const metadata: Metadata = { title: "소식", description: "샬롬의 집의 공지사항과 활동 소식을 확인합니다." };
export const dynamic = "force-dynamic";
const PAGE_SIZE = 8;
const dateFormatter = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
type NewsPageProps = { searchParams: Promise<{ q?: string | string[]; category?: string | string[]; page?: string | string[] }> };

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }
function pageNumber(value: string | undefined) { if (!value || !/^\d+$/.test(value)) return 1; const number = Number(value); return Number.isSafeInteger(number) && number > 0 ? number : 1; }
function queryHref(page: number, q: string, category?: NewsCategory) { const params = new URLSearchParams(); if (q) params.set("q", q); if (category) params.set("category", category); if (page > 1) params.set("page", String(page)); const query = params.toString(); return query ? `/news?${query}` : "/news"; }

export default async function NewsPage({ searchParams }: NewsPageProps) {
  const raw = await searchParams;
  const q = (first(raw.q) ?? "").trim();
  const categoryValue = first(raw.category);
  const category = isNewsCategory(categoryValue) ? categoryValue : undefined;
  const allPosts = await getNewsRepository().listPublished({ limit: 50 });
  const normalizedQuery = q.toLocaleLowerCase("ko-KR");
  const filtered = allPosts.filter((post) => (!category || post.category === category) && (!normalizedQuery || `${post.title} ${post.summary}`.toLocaleLowerCase("ko-KR").includes(normalizedQuery)));
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const currentPage = totalPages === 0 ? 1 : Math.min(pageNumber(first(raw.page)), totalPages);
  const posts = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasFixture = posts.some((post) => post.isDemo);
  const categoryLabel = category ? getNewsCategoryLabel(category) : "전체";

  return <main className="bg-surface">
    <header className="border-b border-border"><div className="mx-auto max-w-site px-page py-10 sm:px-page-wide sm:py-14"><nav aria-label="breadcrumb"><Link className="text-small text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/">홈</Link></nav><p className="mt-7 text-small font-bold text-accent">소식</p><div className="mt-2 flex flex-wrap items-end justify-between gap-5"><div><h1 className="text-safe-wrap text-title font-bold sm:text-[2.5rem]">소식</h1><p className="text-safe-wrap mt-3 max-w-2xl text-body text-muted-foreground">공지사항과 활동 소식을 검색하고 분류별로 확인합니다.</p></div><a className="inline-flex min-h-11 items-center text-small font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={siteConfig.instagram} target="_blank" rel="noreferrer">인스타그램 보기(새 창)</a></div></div></header>

    <div className="mx-auto max-w-site px-page py-10 sm:px-page-wide sm:py-14">
      <form action="/news" method="get" className="grid gap-5 border border-border bg-surface-subtle p-5 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end">
        <div><label className="block text-small font-bold" htmlFor="news-query">검색어</label><input className="mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" id="news-query" name="q" type="search" defaultValue={q} placeholder="제목 또는 요약 검색" /></div>
        <div><label className="block text-small font-bold" htmlFor="news-category">분류</label><select className="mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" id="news-category" name="category" defaultValue={category ?? ""}><option value="">전체</option><option value="notice">공지사항</option><option value="activity">활동 소식</option></select></div>
        <button className="min-h-12 bg-primary px-6 py-3 font-bold text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring" type="submit">소식 검색</button>
      </form>

      <section aria-labelledby="results-heading" className="mt-9"><div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-foreground pb-5"><div><h2 id="results-heading" className="text-heading font-bold">검색 결과</h2><p className="text-safe-wrap mt-2 text-small text-muted-foreground">적용 분류: {categoryLabel}{q ? ` · 검색어: “${q}”` : " · 검색어 없음"} · 전체 {filtered.length}건</p></div><Link className="inline-flex min-h-11 items-center font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href="/news">조건 초기화</Link></div>
        {hasFixture && <aside className="mt-5 border-l-4 border-primary bg-primary-soft px-4 py-3 text-small">현재 표시된 게시물은 목록과 상세 화면 검증용 예시이며 공식 시설 소식이 아닙니다.</aside>}
        {allPosts.length === 0 ? <div className="border-b border-border py-10"><h3 className="text-heading font-bold">전체 게시물을 준비하고 있습니다.</h3><p className="mt-3 text-muted-foreground">공개된 게시물이 아직 없습니다.</p><div className="mt-5 flex flex-wrap gap-5"><a className="font-bold text-primary underline underline-offset-4" href={siteConfig.instagram} target="_blank" rel="noreferrer">인스타그램 보기(새 창)</a><Link className="font-bold text-primary underline underline-offset-4" href="/">홈으로 이동</Link></div></div> : filtered.length === 0 ? <div className="border-b border-border py-10"><h3 className="text-heading font-bold">현재 조건에 맞는 소식이 없습니다.</h3><p className="text-safe-wrap mt-3 text-muted-foreground">분류 {categoryLabel}{q ? `, 검색어 “${q}”` : ""}에 해당하는 결과가 없습니다.</p><div className="mt-5 flex flex-wrap gap-5"><Link className="font-bold text-primary underline underline-offset-4" href="/news">조건 초기화</Link><Link className="font-bold text-primary underline underline-offset-4" href="/news">전체 소식 보기</Link></div></div> : <ul>{posts.map((post)=><li key={post.id} className="border-b border-border"><article className="grid gap-3 py-6 md:grid-cols-[8rem_minmax(0,1fr)_10rem]"><div><p className="text-small font-bold text-primary">{getNewsCategoryLabel(post.category)}</p>{post.isDemo && <p className="mt-1 text-xs text-muted-foreground">개발용 예시</p>}</div><div><h3 className="text-heading font-bold"><Link className="text-safe-wrap underline decoration-border-strong underline-offset-4 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={`/news/${post.slug}`}>{post.title}</Link></h3><p className="text-safe-wrap mt-2 text-body text-muted-foreground">{post.summary}</p></div><time className="text-small text-muted-foreground md:text-right" dateTime={post.publishedAt}>{dateFormatter.format(new Date(post.publishedAt))}</time></article></li>)}</ul>}
      </section>
      {totalPages > 1 && <nav aria-label="소식 페이지 이동" className="mt-9"><ul className="flex flex-wrap items-center justify-center gap-2"><li>{currentPage > 1 && <Link className="inline-flex min-h-11 items-center border border-border px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={queryHref(currentPage - 1, q, category)}>이전 페이지</Link>}</li>{Array.from({ length: totalPages },(_,i)=>i+1).map((number)=><li key={number}><Link aria-current={number === currentPage ? "page" : undefined} className={`inline-flex min-h-11 min-w-11 items-center justify-center border px-3 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring ${number === currentPage ? "border-primary bg-primary text-primary-foreground" : "border-border"}`} href={queryHref(number,q,category)} aria-label={`${number}페이지`}>{number}</Link></li>)}<li>{currentPage < totalPages && <Link className="inline-flex min-h-11 items-center border border-border px-4 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" href={queryHref(currentPage + 1,q,category)}>다음 페이지</Link>}</li></ul></nav>}
    </div>
  </main>;
}
