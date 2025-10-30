// 서버 컴포넌트: 클라이언트 리스트를 렌더링
import RacketsClient from './_components/RacketsClient';

export const dynamic = 'force-dynamic'; // 최신 데이터 우선

export default function RacketsPage() {
  return <RacketsClient />;
}
