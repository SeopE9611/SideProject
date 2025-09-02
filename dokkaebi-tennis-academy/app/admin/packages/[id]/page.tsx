import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';
import PackageDetailClient from './PackageDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PackageDetailPage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  const { id } = await params;
  return <PackageDetailClient packageId={id} />;
}
