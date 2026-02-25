import UserDetailClient from '@/app/admin/users/_components/UserDetailClient';

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl">
        <UserDetailClient id={id} />
      </div>
    </div>
  );
}
