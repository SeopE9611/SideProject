import type { Metadata } from 'next';
import AdminNotificationsClient from '@/app/admin/notifications/_components/AdminNotificationsClient';

export const metadata: Metadata = {
  title: '알림 발송함 | 관리자',
  description: '관리자 알림 발송 내역(Outbox)을 조회하고 재시도/강제 발송을 관리합니다.',
};

export default function AdminNotificationsPage() {
  return (
    <div className="p-6">
      <AdminNotificationsClient />
    </div>
  );
}
