export type PublicSeoRoute = { path: string; title: string; description: string };
export const publicSeoRoutes: readonly PublicSeoRoute[] = [
  ["/", "샬롬의 집", "지체 및 지적 장애인이 함께 생활하는 장애인거주시설 샬롬의 집 공식 홈페이지"],
  ["/about", "시설개요", "샬롬의 집의 시설 유형, 운영 방향, 기본 현황과 이용 안내를 확인할 수 있습니다."],
  ["/about/greeting", "인사말", "샬롬의 집이 지향하는 돌봄과 운영 방향을 담은 공식 인사말입니다."],
  ["/about/people", "함께하는 사람들", "샬롬의 집 운영을 담당하는 직원의 역할과 업무 영역을 안내합니다."],
  ["/about/spaces", "생활공간", "샬롬의 집의 주요 생활공간과 공간별 이용 목적을 안내합니다."],
  ["/about/directions", "찾아오시는 길", "샬롬의 집 주소, 대표 전화와 방문 전 확인 사항을 안내합니다."],
  ["/life", "생활이야기", "샬롬의 집의 일상생활 지원과 생활 운영 방향을 소개합니다."],
  ["/life/programs", "프로그램", "샬롬의 집에서 운영하는 생활지원·건강·여가 프로그램을 확인할 수 있습니다."],
  ["/life/gallery", "활동사진", "공개 승인과 동의 검토를 마친 샬롬의 집 활동사진을 확인할 수 있습니다."],
  ["/news", "소식", "샬롬의 집의 공지사항과 공개된 활동소식을 확인할 수 있습니다."],
  ["/news/notices", "공지사항", "샬롬의 집 운영과 이용에 필요한 공식 공지사항을 안내합니다."],
  ["/news/activities", "활동소식", "샬롬의 집에서 공개한 최근 활동과 프로그램 소식을 전합니다."],
  ["/transparency", "자료공개", "샬롬의 집의 운영 및 후원 관련 공개자료를 확인할 수 있습니다."],
  ["/support", "함께하기", "샬롬의 집 후원, 자원봉사와 문의 참여 방법을 안내합니다."],
  ["/support/donation", "후원하기", "샬롬의 집 후원 절차, 사용 원칙과 문의 방법을 안내합니다."],
  ["/support/volunteer", "자원봉사", "샬롬의 집 자원봉사 신청 절차와 활동 전 확인 사항을 안내합니다."],
  ["/support/contact", "문의하기", "일반·방문·자원봉사·후원 문의를 안전하게 접수하는 방법을 안내합니다."],
].map(([path, title, description]) => ({ path, title, description }));
export function findPublicSeoRoute(path: string): PublicSeoRoute {
  const route = publicSeoRoutes.find((item) => item.path === path);
  if (!route) throw new Error(`등록되지 않은 공개 SEO route입니다: ${path}`);
  return route;
}
