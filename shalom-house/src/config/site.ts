export const siteConfig = {
  name: "샬롬의 집",
  description: "지체 및 지적 장애인이 함께 생활하는 장애인거주시설 샬롬의 집 공식 홈페이지",
  address: "서울특별시 강서구 방화대로7가길 11",
  phone: "02-2662-2488",
  instagram: "https://www.instagram.com/seoul_shalom_house/",
  mainNavigation: [
    {
      label: "시설소개",
      description: "시설의 기본 정보와 운영 방향",
      href: "/about",
      emphasis: false,
      children: [
        {
          label: "시설개요",
          description: "샬롬의 집 기본 정보",
          href: "/about",
        },
        {
          label: "인사말",
          description: "공식 인사말 안내",
          href: "/about/greeting",
        },
        {
          label: "함께하는 사람들",
          description: "직원 역할 안내",
          href: "/about/people",
        },
        { label: "생활공간", description: "공간 안내", href: "/about/spaces" },
        {
          label: "찾아오시는 길",
          description: "주소와 방문 문의",
          href: "/about/directions",
        },
      ],
    },
    {
      label: "생활·프로그램",
      description: "일상생활, 프로그램과 공개 승인된 활동 기록",
      href: "/life",
      emphasis: false,
      children: [
        { label: "생활이야기", description: "일상과 활동 기록", href: "/life" },
        {
          label: "프로그램",
          description: "프로그램 분류와 안내",
          href: "/life/programs",
        },
        {
          label: "활동사진",
          description: "공개 승인된 활동 기록",
          href: "/life/gallery",
        },
      ],
    },
    {
      label: "소식",
      description: "공지사항, 활동소식과 공개자료",
      href: "/news",
      emphasis: false,
      children: [
        {
          label: "공지사항",
          description: "시설 공지 안내",
          href: "/news/notices",
        },
        {
          label: "활동소식",
          description: "공개된 활동 기록",
          href: "/news/activities",
        },
        {
          label: "자료공개",
          description: "운영 및 후원 공개자료",
          href: "/transparency",
        },
      ],
    },
    {
      label: "함께하기",
      description: "후원, 자원봉사와 참여 문의",
      href: "/support",
      emphasis: true,
      children: [
        {
          label: "후원하기",
          description: "후원 절차 확인",
          href: "/support/donation",
        },
        {
          label: "자원봉사",
          description: "참여 절차 확인",
          href: "/support/volunteer",
        },
        {
          label: "문의하기",
          description: "연락 경로 안내",
          href: "/support/contact",
        },
      ],
    },
  ],
  footerNavigation: [
    {
      label: "공지사항",
      href: "/news/notices",
    },
    {
      label: "프로그램",
      href: "/life/programs",
    },
    {
      label: "활동사진",
      href: "/life/gallery",
    },
    {
      label: "후원하기",
      href: "/support/donation",
    },
    {
      label: "찾아오시는 길",
      href: "/about/directions",
    },
    {
      label: "자료공개",
      href: "/transparency",
    },
  ],
} as const;
