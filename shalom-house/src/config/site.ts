export const siteConfig = {
  name: "샬롬의 집",
  description:
    "지체 및 지적 장애인이 함께 생활하는 장애인거주시설 샬롬의 집 공식 홈페이지",
  address: "서울특별시 강서구 방화대로7가길 11",
  phone: "02-2662-2488",
  instagram: "https://www.instagram.com/seoul_shalom_house/",
  mainNavigation: [
    {
      label: "시설소개",
      description: "시설의 기본 정보와 방문 안내",
      href: "/about",
      emphasis: false,
      children: [
        {
          label: "시설소개",
          description: "샬롬의 집 기본 정보",
          href: "/about",
        },
        {
          label: "찾아오시는 길",
          description: "주소와 방문 문의",
          href: "/about/directions",
        },
      ],
    },
    {
      label: "생활이야기",
      description: "함께 이어가는 일상과 활동",
      href: "/life",
      emphasis: false,
      children: [],
    },
    {
      label: "소식",
      description: "공지사항과 활동소식",
      href: "/news",
      emphasis: false,
      children: [],
    },
    {
      label: "함께하기",
      description: "후원과 자원봉사 문의",
      href: "/support",
      emphasis: true,
      children: [],
    },
    {
      label: "정보공개",
      description: "운영 및 후원 공개자료",
      href: "/transparency",
      emphasis: false,
      children: [],
    },
  ],
  footerNavigation: [
    {
      label: "찾아오시는 길",
      href: "/about/directions",
    },
    {
      label: "함께하기",
      href: "/support",
    },
    {
      label: "정보공개",
      href: "/transparency",
    },
  ],
} as const;
