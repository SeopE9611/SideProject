import { createPublicPageMetadata } from "@/features/seo/metadata";

export const metadata = createPublicPageMetadata("/news/activities");


import { NewsListPage, type NewsSearchParams } from "@/components/news/news-list-page";


export const dynamic = "force-dynamic";

export default function ActivitiesPage({ searchParams }: { searchParams: Promise<NewsSearchParams> }) {
  return (
    <NewsListPage
      basePath="/news/activities"
      title="활동소식"
      description="공개 승인된 활동소식을 검색하고 확인합니다."
      fixedCategory="activity"
      searchParams={searchParams}
    />
  );
}
