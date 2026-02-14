import { headers } from 'next/headers';
import StringingApplicationDetailClient from '@/app/features/stringing-applications/components/StringingApplicationDetailClient';

type StringingDetailPageProps = {
  params: Promise<{ id: string }>;
};
export default async function StringingApplicationDetailPage({ params }: StringingDetailPageProps) {

  const { id } = await params;
  const host = (await headers()).get('host');
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}`;

  return <StringingApplicationDetailClient id={id} baseUrl={baseUrl} isAdmin={true} />;
}
