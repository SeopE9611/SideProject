import ApplicationDetail from '@/app/mypage/applications/_components/ApplicationDetail';

interface Props {
  params: { id: string };
}
export default function ApplicationDetailPage({ params }: Props) {
  return <ApplicationDetail id={params.id} />;
}
