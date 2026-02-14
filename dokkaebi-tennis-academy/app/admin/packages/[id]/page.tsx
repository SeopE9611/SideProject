import PackageDetailClient from './PackageDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PackageDetailPage({ params }: Props) {

  const { id } = await params;
  return <PackageDetailClient packageId={id} />;
}
