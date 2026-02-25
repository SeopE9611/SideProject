import AdminDashboardClient from './_components/AdminDashboardClient';

export default async function AdminDashboardPage() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        <AdminDashboardClient />
      </div>
    </div>
  );
}
