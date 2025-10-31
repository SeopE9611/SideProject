import AdminRacketEditClient from '@/app/admin/rackets/[id]/edit/_components/AdminRacketEditClient';

export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminRacketEditClient id={id} />;
}
