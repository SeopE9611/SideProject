import type { Metadata } from "next";

import { NewsListPage, type NewsSearchParams } from "@/components/news/news-list-page";

export const metadata: Metadata = {
  title: "공지사항",
};

export const dynamic = "force-dynamic";

export default function NoticesPage({ searchParams }: { searchParams: Promise<NewsSearchParams> }) {
  return (
    <NewsListPage
      basePath="/news/notices"
      title="공지사항"
      description="공개된 공지사항을 검색하고 확인합니다."
      fixedCategory="notice"
      searchParams={searchParams}
    />
  );
}
