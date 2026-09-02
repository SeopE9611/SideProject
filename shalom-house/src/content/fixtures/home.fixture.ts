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

type HomeFixture = {
  heroMedia: HomeMedia;
  lifeMedia: Extract<HomeMedia, { kind: "placeholder" }>;
  quickLinks: readonly HomeQuickLink[];
  lifeLinks: readonly HomeQuickLink[];
  participationLinks: readonly Pick<HomeQuickLink, "label" | "href">[];
};

export const homeFixture: HomeFixture = {
  heroMedia: {
    kind: "placeholder",
    label: "공식 시설 이미지 준비 중",
    description: "승인된 시설 사진이 등록되면 이 영역에 표시됩니다.",
    caption: "승인된 시설 사진을 준비하고 있습니다.",
  },
  lifeMedia: {
    kind: "placeholder",
    label: "생활 기록 이미지 영역",
    description: "공개 동의와 승인을 마친 활동 이미지가 등록되면 같은 비율로 표시됩니다.",
    caption: "현재 표시는 레이아웃 검증용 fixture이며 실제 시설 또는 거주인 사진이 아닙니다.",
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
  lifeLinks: [
    { label: "생활이야기", description: "샬롬의 집의 생활과 활동 기록을 살펴봅니다.", href: "/life" },
    { label: "프로그램", description: "공개된 프로그램의 분류와 목적을 확인합니다.", href: "/life/programs" },
    { label: "활동사진", description: "공개 동의와 승인을 마친 사진을 확인합니다.", href: "/life/gallery" },
  ],
  participationLinks: [
    { label: "후원하기", href: "/support/donation" },
    { label: "자원봉사", href: "/support/volunteer" },
    { label: "문의하기", href: "/support/contact" },
  ],
};
