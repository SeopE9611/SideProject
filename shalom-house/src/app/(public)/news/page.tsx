import type { Metadata } from "next";

import {
  NewsListPage,
  type NewsSearchParams,
} from "@/components/news/news-list-page";

export const metadata: Metadata = {
  title: "소식",
  description: "샬롬의 집의 공지사항과 활동 소식을 확인합니다.",
};

export const dynamic = "force-dynamic";

export default function NewsPage({
  searchParams,
}: {
  searchParams: Promise<NewsSearchParams>;
}) {
  return (
    <NewsListPage
      basePath="/news"
      title="소식"
      description="공지사항과 활동 소식을 검색하고 분류별로 확인합니다."
      searchParams={searchParams}
    />
  );
}
