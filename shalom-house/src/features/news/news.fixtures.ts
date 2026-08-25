import type {
  NewsApprovalStatus,
  NewsCategory,
  NewsPublicationStatus,
  PublicNewsPost,
} from "./news.types";

type FixtureNewsPost = Omit<PublicNewsPost, "isDemo"> & {
  publicationStatus: NewsPublicationStatus;
  approvalStatus: NewsApprovalStatus;
};

const fixtureNewsPosts: readonly FixtureNewsPost[] = [
  {
    id: "fixture-news-board-layout",
    slug: "news-board-layout-example",
    category: "notice",
    title: "[개발용 예시] 홈페이지 소식 게시판 구성 확인",
    summary:
      "목록의 제목, 분류, 요약과 게시일 배치를 확인하기 위한 예시이며 공식 시설 소식이 아닙니다.",
    body: [
      "이 글은 목록과 상세 화면의 구조를 확인하기 위한 개발용 예시입니다.",
      "개인정보가 없는 일반 텍스트 문단의 표시 방식을 확인하며, 승인된 실제 콘텐츠가 준비되면 교체됩니다.",
    ],
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: "2025-03-03T09:00:00.000Z",
    updatedAt: "2025-03-03T09:00:00.000Z",
  },
  {
    id: "fixture-notice-detail",
    slug: "notice-detail-layout-example",
    category: "notice",
    title: "[개발용 예시] 공지사항 상세 화면 구성 확인",
    summary:
      "공지사항 상세 화면의 정보 순서를 확인하기 위한 예시이며 공식 시설 소식이 아닙니다.",
    body: [
      "이 문장은 공지사항 상세 화면의 문단 간격과 읽기 흐름을 확인하기 위한 예시입니다.",
      "실제 콘텐츠가 공개 승인을 받으면 이 예시는 사용되지 않으며, 실제 운영 사실을 나타내지 않습니다.",
    ],
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: "2025-02-17T09:00:00.000Z",
    updatedAt: "2025-02-17T09:00:00.000Z",
  },
  {
    id: "fixture-activity-detail",
    slug: "activity-detail-layout-example",
    category: "activity",
    title: "[개발용 예시] 활동 소식 상세 화면 구성 확인",
    summary:
      "활동 소식 상세 화면의 구성을 확인하기 위한 예시이며 실제 활동 기록이 아닙니다.",
    body: [
      "이 글은 활동 소식 상세 화면의 제목과 본문 구조를 확인하기 위한 개발용 예시입니다.",
      "개인정보나 실제 활동 정보는 포함하지 않으며, 승인된 실제 콘텐츠가 준비되면 교체됩니다.",
    ],
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: "2025-02-03T09:00:00.000Z",
    updatedAt: "2025-02-03T09:00:00.000Z",
  },
] satisfies readonly (FixtureNewsPost & { category: NewsCategory })[];

export function getPublishedFixtureNewsPosts(): readonly PublicNewsPost[] {
  return fixtureNewsPosts
    .filter(
      (post) =>
        post.publicationStatus === "published" &&
        post.approvalStatus === "approved",
    )
    .map((post) => ({
      id: post.id,
      slug: post.slug,
      category: post.category,
      title: post.title,
      summary: post.summary,
      body: post.body,
      publishedAt: post.publishedAt,
      updatedAt: post.updatedAt,
      isDemo: true,
    }));
}
