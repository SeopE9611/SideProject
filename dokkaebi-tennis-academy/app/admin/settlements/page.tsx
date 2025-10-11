import SettlementsClient from '@/app/admin/settlements/_components/SettlementsClient';

export const dynamic = 'force-dynamic'; // 최신 스냅샷 보려고(SSG 비활성)
export default function Page() {
  return <SettlementsClient />;
}
