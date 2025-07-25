'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface PaymentFormValues {
  depositor: string;
  totalPrice: number;
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
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({ defaultValues: initialData });

  async function onSubmit(data: PaymentFormValues) {
    const res = await fetch(`${resourcePath}/${entityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        depositor: data.depositor,
        totalPrice: data.totalPrice,
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
        {errors.depositor && <p className="text-red-500 text-xs">{errors.depositor.message}</p>}
      </div>

      <div>
        <Label htmlFor="totalPrice">결제 금액</Label>
        <Input
          id="totalPrice"
          type="number"
          {...register('totalPrice', {
            required: '필수 입력입니다.',
            valueAsNumber: true,
          })}
        />
        {errors.totalPrice && <p className="text-red-500 text-xs">{errors.totalPrice.message}</p>}
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
