'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { showSuccessToast, showErrorToast } from '@/lib/toast';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

interface Props {
  initial: string;
  resourcePath: string; // e.g. "/api/applications/stringing"
  entityId: string; // application ID
  onSuccess: () => void;
  onCancel: () => void;
}

export default function RequirementsEditForm({ initial, resourcePath, entityId, onSuccess, onCancel }: Props) {
  const [value, setValue] = useState(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // baseline(initial) 대비 값이 바뀌었는지 판단
  const isDirty = useMemo(() => value !== initial, [value, initial]);

  // 이탈(탭 닫기/새로고침/뒤로가기/링크 이동) 경고
  useUnsavedChangesGuard(isDirty && !isSubmitting);

  // “취소”는 폼 닫기라 입력 손실 위험이 있으므로 confirm
  const handleCancel = () => {
    if (isDirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    onCancel();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
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
      setIsSubmitting(false);
      onSuccess();
    } catch {
      setIsSubmitting(false);
      showErrorToast('요청사항 수정에 실패했습니다.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea value={value} onChange={(e) => setValue(e.currentTarget.value)} placeholder="요청사항을 입력해주세요" rows={4} />
      <div className="flex justify-end gap-2">
        <Button type="submit">저장</Button>
        <Button variant="outline" onClick={handleCancel}>
          취소
        </Button>
      </div>
    </form>
  );
}
