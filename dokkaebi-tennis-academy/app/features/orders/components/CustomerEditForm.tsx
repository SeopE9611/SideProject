'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface CustomerFormValues {
  name: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
}

interface Props {
  initialData: CustomerFormValues;
  orderId: string;
  onSuccess: (updated: CustomerFormValues) => void;
  onCancel: () => void;
}

export default function CustomerEditForm({ initialData, orderId, onSuccess, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    defaultValues: initialData,
  });

  async function onSubmit(data: CustomerFormValues) {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer: data }),
    });
    if (!res.ok) {
      // 에러 처리 (toast 등)
      return;
    }
    onSuccess(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">이름</label>
        <Input {...register('name', { required: '필수 입력입니다.' })} />
        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium">이메일</label>
        <Input
          {...register('email', {
            required: '필수 입력입니다.',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '유효한 이메일을 입력하세요.' },
          })}
        />
        {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium">전화번호</label>
        <Input {...register('phone', { required: '필수 입력입니다.' })} />
      </div>
      <div>
        <label className="block text-sm font-medium">주소</label>
        <Textarea {...register('address', { required: '필수 입력입니다.' })} rows={2} />
      </div>
      <div>
        <label className="block text-sm font-medium">우편번호</label>
        <Input {...register('postalCode')} />
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
