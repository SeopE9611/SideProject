export type FixtureContentStatus = "fixture";

export type HomeMedia =
  | {
      kind: "image";
      src: string;
      alt: string;
      width: number;
      height: number;
      caption?: string;
    }
  | {
      kind: "placeholder";
      label: string;
      description: string;
      caption?: string;
    };

type HomeQuickLink = {
  label: string;
  description: string;
  href: string;
};

type HomeSupportArea = {
  id: string;
  label: string;
  title: string;
  description: string;
  href: string;
};

type HomeStory = {
  id: string;
  category: string;
  title: string;
  description: string;
  dateLabel: string;
  href: string;
  media?: HomeMedia;
};

type HomeDocument = {
  id: string;
  title: string;
  period: string;
  format: string;
  statusLabel: string;
  href: string;
};

type HomeFixture = {
  contentStatus: FixtureContentStatus;
  heroMedia: HomeMedia;
  quickLinks: readonly HomeQuickLink[];
  supportAreas: readonly HomeSupportArea[];
  stories: readonly HomeStory[];
  documents: readonly HomeDocument[];
};

export const homeFixture: HomeFixture = {
  contentStatus: "fixture",
  heroMedia: {
    kind: "placeholder",
    label: "공식 시설 이미지 준비 중",
    description: "승인된 시설 사진이 등록되면 이 영역에 표시됩니다.",
    caption: "현재 화면은 배치 검증용이며 공식 시설 사진이 아닙니다.",
  },
  quickLinks: [
    {
      label: "찾아오시는 길",
      description: "주소와 방문 문의 정보를 확인합니다.",
      href: "/about/directions",
    },
    {
      label: "공지사항",
      description: "새로운 공지와 안내를 확인합니다.",
      href: "/news/notices",
    },
    {
      label: "프로그램",
      description: "프로그램 분류와 안내를 확인합니다.",
      href: "/life/programs",
    },
    {
      label: "활동사진",
      description: "공개 승인된 활동 기록을 살펴봅니다.",
      href: "/life/gallery",
    },
    {
      label: "후원하기",
      description: "후원 문의와 확인 절차를 알아봅니다.",
      href: "/support/donation",
    },
    {
      label: "자원봉사",
      description: "자원봉사 참여 절차를 확인합니다.",
      href: "/support/volunteer",
    },
  ],
  supportAreas: [
    {
      id: "fixture-daily-support",
      label: "화면 예시",
      title: "일상생활 지원 정보 구조",
      description: "지원 정보를 어떻게 분류해 보여 줄지 확인하는 테스트 항목입니다.",
      href: "/life",
    },
    {
      id: "fixture-community",
      label: "화면 예시",
      title: "지역사회 활동 정보 구조",
      description: "활동 안내의 제목과 설명 길이를 검증하는 테스트 항목입니다.",
      href: "/life",
    },
    {
      id: "fixture-space",
      label: "화면 예시",
      title: "생활공간 안내 정보 구조",
      description: "공간 안내 화면으로 이어지는 구성을 확인하는 테스트 항목입니다.",
      href: "/life",
    },
    {
      id: "fixture-safety",
      label: "화면 예시",
      title: "건강·안전 정보 구조",
      description: "확인된 건강·안전 정보를 배치하기 위한 레이아웃 예시입니다.",
      href: "/about",
    },
  ],
  stories: [
    {
      id: "fixture-story-short",
      category: "생활 기록 예시",
      title: "도구 정리",
      description: "짧은 기록의 정보 배치를 확인하기 위한 테스트 데이터입니다.",
      dateLabel: "2026년 1월 12일",
      href: "/life",
      media: {
        kind: "placeholder",
        label: "생활 기록 이미지 준비 중",
        description: "공개 승인을 받은 이미지가 등록되면 표시됩니다.",
      },
    },
    {
      id: "fixture-story-long",
      category: "공간 기록 예시",
      title: "공용 공간 안내에서 긴 제목이 여러 줄로 표시되는 상태 확인",
      description:
        "긴 제목과 설명이 작은 화면에서도 내용과 상세 경로를 유지하는지 확인하는 테스트 데이터입니다.",
      dateLabel: "2026년 1월 8일",
      href: "/life",
      media: {
        kind: "placeholder",
        label: "생활 기록 이미지 준비 중",
        description: "공개 승인을 받은 이미지가 등록되면 표시됩니다.",
      },
    },
    {
      id: "fixture-story-no-image",
      category: "활동 기록 예시",
      title: "이미지 없는 기록",
      description:
        "이미지가 없어도 날짜, 제목, 설명과 링크가 자연스럽게 보이는지 확인합니다.",
      dateLabel: "2026년 1월 3일",
      href: "/life",
    },
  ],
  documents: [
    {
      id: "fixture-document-one",
      title: "레이아웃 검증용 운영자료 목록",
      period: "테스트 기준 기간",
      format: "형식 확인 필요",
      statusLabel: "파일 없음",
      href: "/transparency",
    },
    {
      id: "fixture-document-two",
      title: "샘플 공개자료 긴 제목 표시 확인",
      period: "샘플 기간",
      format: "형식 확인 필요",
      statusLabel: "상세 화면 준비 중",
      href: "/transparency",
    },
    {
      id: "fixture-document-three",
      title: "테스트 후원자료 목록 항목",
      period: "레이아웃 검증 기간",
      format: "형식 확인 필요",
      statusLabel: "파일 없음",
      href: "/transparency",
    },
  ],
};
