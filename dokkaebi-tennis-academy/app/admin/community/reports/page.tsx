import { redirect } from 'next/navigation';

export default function AdminCommunityReportsPage() {
  redirect('/admin/boards?tab=reports');
}
