'use client';

import { useTransition, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { APPLICATION_STATUSES } from '@/lib/application-status';
import { useRouter } from 'next/navigation';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { applicationStatusColors } from '@/lib/badge-style';

interface Props {
  applicationId: string;
  currentStatus: string;
  onUpdated?: () => void; // 상태 변경 후 SWR 갱신 트리거
}

export function ApplicationStatusSelect({ applicationId, currentStatus, onUpdated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const router = useRouter();

  const handleChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/applications/${applicationId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
          credentials: 'include',
        });

        if (!res.ok) throw new Error('상태 변경 실패');

        showSuccessToast('상태가 성공적으로 변경되었습니다.');
        onUpdated?.(); //  상태 변경 후 부모에서 mutate() 실행
        router.refresh();
      } catch (err) {
        showErrorToast('상태 변경 중 오류가 발생했습니다.');
        setSelectedStatus(currentStatus);
      }
    });
  };

  return (
    <Select value={selectedStatus} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="상태 선택" />
      </SelectTrigger>
      <SelectContent>
        {APPLICATION_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${applicationStatusColors[status]}`}>{status}</div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
