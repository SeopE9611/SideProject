export const siteConfig = {
  name: "샬롬의 집",
  description: "서울 강서구 장애인거주시설 샬롬의 집 공식 홈페이지",
  address: "서울특별시 강서구 방화대로7가길 11",
  phone: "02-2662-2488",
  mainNavigation: [
    {
      label: "샬롬 소개",
      description: "시설 소개와 기본 정보",
      href: "/about",
      emphasis: false,
    },
    {
      label: "생활과 활동",
      description: "함께 만드는 일상과 활동",
      href: "/life",
      emphasis: false,
    },
    {
      label: "소식과 이야기",
      description: "공지사항과 활동 이야기",
      href: "/news",
      emphasis: false,
    },
    {
      label: "함께하기",
      description: "후원과 자원봉사 문의",
      href: "/support",
      emphasis: true,
    },
    {
      label: "운영 공개",
      description: "운영 및 후원 관련 공개 자료",
      href: "/transparency",
      emphasis: false,
    },
  ],
} as const;
