'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

export interface PaymentFormValues {
  depositor: string;
}

interface Props {
  initialData: PaymentFormValues;
  resourcePath: string; // ex) '/api/applications/stringing'
  entityId: string; // applicationId
  onSuccess: (data: PaymentFormValues) => void;
  onCancel: () => void;
}

export default function PaymentEditForm({ initialData, resourcePath, entityId, onSuccess, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PaymentFormValues>({ defaultValues: initialData });

  // 입력값이 defaultValues 대비 변경되면 isDirty=true → 이탈(뒤로/탭닫기/링크이동) 경고
  useUnsavedChangesGuard(isDirty && !isSubmitting);

  async function onSubmit(data: PaymentFormValues) {
    const res = await fetch(`${resourcePath}/${entityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        depositor: data.depositor,
      }),
    });
    if (!res.ok) {
      console.error(await res.text());
      return;
    }
    onSuccess(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="depositor">입금자명</Label>
        <Input id="depositor" {...register('depositor', { required: '필수 입력입니다.' })} />
        {errors.depositor && <p className="text-destructive text-xs">{errors.depositor.message}</p>}
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" type="button" onClick={onCancel} disabled={isSubmitting}>
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          저장
        </Button>
      </div>
    </form>
  );
}
