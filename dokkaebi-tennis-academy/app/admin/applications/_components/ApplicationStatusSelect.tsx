'use client';

import { useTransition, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { APPLICATION_STATUSES } from '@/lib/application-status';

interface Props {
  applicationId: string;
  currentStatus: string;
}

export function ApplicationStatusSelect({ applicationId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  const handleChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/applications/${applicationId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!res.ok) throw new Error('상태 변경 실패');

        toast.success('상태가 성공적으로 변경되었습니다.');
      } catch (err) {
        toast.error('상태 변경 중 오류가 발생했습니다.');
        setSelectedStatus(currentStatus); // 실패 시 이전 상태로 되돌리기
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
            <Badge variant="outline">{status}</Badge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
