'use client';

import { FormEvent, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

interface Props {
  initial: string;
  resourcePath: string; // e.g. "/api/applications/stringing"
  entityId: string; // application ID
  onSuccess: () => void;
  onCancel: () => void;
}

export default function RequirementsEditForm({ initial, resourcePath, entityId, onSuccess, onCancel }: Props) {
  const [value, setValue] = useState(initial);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${resourcePath}/${entityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          stringDetails: { requirements: value },
        }),
      });
      if (!res.ok) throw new Error();
      showSuccessToast('요청사항이 수정되었습니다.');
      onSuccess();
    } catch {
      showErrorToast('요청사항 수정에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea value={value} onChange={(e) => setValue(e.currentTarget.value)} placeholder="요청사항을 입력해주세요" rows={4} />
      <div className="flex justify-end gap-2">
        <Button type="submit">저장</Button>
        <Button variant="outline" onClick={onCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}
