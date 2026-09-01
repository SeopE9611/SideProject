import type {
  NewsApprovalStatus,
  NewsCategory,
  NewsPublicationStatus,
  PublicNewsPost,
} from "@/features/news/news.types";

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
    summary: "목록의 제목, 분류, 요약과 게시일 배치를 확인하기 위한 예시이며 공식 시설 소식이 아닙니다.",
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
    summary: "공지사항 상세 화면의 정보 순서를 확인하기 위한 예시이며 공식 시설 소식이 아닙니다.",
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
    summary: "활동 소식 상세 화면의 구성을 확인하기 위한 예시이며 실제 활동 기록이 아닙니다.",
    body: [
      "이 글은 활동 소식 상세 화면의 제목과 본문 구조를 확인하기 위한 개발용 예시입니다.",
      "개인정보나 실제 활동 정보는 포함하지 않으며, 승인된 실제 콘텐츠가 준비되면 교체됩니다.",
    ],
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: "2025-02-03T09:00:00.000Z",
    updatedAt: "2025-02-03T09:00:00.000Z",
  },
  {
    id: "fixture-list-state-1",
    slug: "fixture-list-state-1",
    category: "notice",
    title: "[개발용 예시] 짧은 공지",
    summary: "짧은 요약 표시 예시입니다.",
    body: [
      "이 문단은 상세 본문의 읽기 폭과 간격을 확인하는 개발용 예시입니다.",
      "실제 시설의 사건, 일정 또는 활동을 나타내지 않습니다.",
    ],
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: "2025-01-27T09:00:00.000Z",
    updatedAt: "2025-01-27T09:00:00.000Z",
  },
  {
    id: "fixture-list-state-2",
    slug: "fixture-list-state-2",
    category: "activity",
    title: "[개발용 예시] 목록에서 매우 긴 활동 소식 제목이 여러 줄로 이어질 때의 줄바꿈과 정보 순서를 확인하는 게시물",
    summary:
      "두 줄 이상 이어지는 긴 요약의 배치와 작은 화면에서의 안전한 줄바꿈을 확인하기 위한 개발용 테스트 데이터이며 실제 활동을 나타내지 않습니다.",
    body: [
      "이 문단은 상세 본문의 읽기 폭과 간격을 확인하는 개발용 예시입니다.",
      "실제 시설의 사건, 일정 또는 활동을 나타내지 않습니다.",
    ],
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: "2025-01-20T09:00:00.000Z",
    updatedAt: "2025-01-23T09:00:00.000Z",
  },
  {
    id: "fixture-list-state-3",
    slug: "fixture-list-state-3",
    category: "notice",
    title: "[개발용 예시] 검색 조건 확인",
    summary: "제목과 요약 검색 동작을 확인합니다.",
    body: [
      "이 문단은 상세 본문의 읽기 폭과 간격을 확인하는 개발용 예시입니다.",
      "실제 시설의 사건, 일정 또는 활동을 나타내지 않습니다.",
    ],
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: "2025-01-13T09:00:00.000Z",
    updatedAt: "2025-01-13T09:00:00.000Z",
  },
  {
    id: "fixture-list-state-4",
    slug: "fixture-list-state-4",
    category: "activity",
    title: "[개발용 예시] 활동 분류 확인",
    summary: "활동 소식 분류 필터를 확인하는 예시입니다.",
    body: [
      "이 문단은 상세 본문의 읽기 폭과 간격을 확인하는 개발용 예시입니다.",
      "실제 시설의 사건, 일정 또는 활동을 나타내지 않습니다.",
    ],
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: "2025-01-06T09:00:00.000Z",
    updatedAt: "2025-01-08T09:00:00.000Z",
  },
  {
    id: "fixture-list-state-5",
    slug: "fixture-list-state-5",
    category: "notice",
    title: "[개발용 예시] 페이지 이동 첫 항목",
    summary: "여러 페이지 목록과 query 유지를 확인합니다.",
    body: [
      "이 문단은 상세 본문의 읽기 폭과 간격을 확인하는 개발용 예시입니다.",
      "실제 시설의 사건, 일정 또는 활동을 나타내지 않습니다.",
    ],
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: "2024-12-30T09:00:00.000Z",
    updatedAt: "2024-12-30T09:00:00.000Z",
  },
  {
    id: "fixture-list-state-6",
    slug: "fixture-list-state-6",
    category: "activity",
    title: "[개발용 예시] 페이지 이동 두 번째 항목",
    summary: "페이지 번호 이동을 검증하기 위한 예시입니다.",
    body: [
      "이 문단은 상세 본문의 읽기 폭과 간격을 확인하는 개발용 예시입니다.",
      "실제 시설의 사건, 일정 또는 활동을 나타내지 않습니다.",
    ],
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: "2024-12-23T09:00:00.000Z",
    updatedAt: "2024-12-23T09:00:00.000Z",
  },
  {
    id: "fixture-list-state-7",
    slug: "fixture-list-state-7",
    category: "notice",
    title: "[개발용 예시] 공지 목록 마지막 항목",
    summary: "공지와 활동이 섞인 목록 정렬을 확인하는 예시입니다.",
    body: [
      "이 문단은 상세 본문의 읽기 폭과 간격을 확인하는 개발용 예시입니다.",
      "실제 시설의 사건, 일정 또는 활동을 나타내지 않습니다.",
    ],
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: "2024-12-16T09:00:00.000Z",
    updatedAt: "2024-12-19T09:00:00.000Z",
  },
  {
    id: "fixture-list-state-8",
    slug: "fixture-list-state-8",
    category: "activity",
    title: "[개발용 예시] 활동 목록 마지막 항목",
    summary: "전체 fixture 수량과 두 번째 페이지 표시를 확인합니다.",
    body: [
      "이 문단은 상세 본문의 읽기 폭과 간격을 확인하는 개발용 예시입니다.",
      "실제 시설의 사건, 일정 또는 활동을 나타내지 않습니다.",
    ],
    publicationStatus: "published",
    approvalStatus: "approved",
    publishedAt: "2024-12-09T09:00:00.000Z",
    updatedAt: "2024-12-09T09:00:00.000Z",
  },
] satisfies readonly (FixtureNewsPost & { category: NewsCategory })[];

export function getPublishedFixtureNewsPosts(): readonly PublicNewsPost[] {
  return fixtureNewsPosts
    .filter((post) => post.publicationStatus === "published" && post.approvalStatus === "approved")
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
