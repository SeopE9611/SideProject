// app/features/stringing-applications/components/CustomerEditForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface CustomerFormValues {
  name: string;
  email: string;
  phone: string;
  address: string;
  addressDetail: string; // 상세주소 추가
  postalCode: string;
}

interface Props {
  initialData: CustomerFormValues;
  resourcePath: string; // ex) '/api/applications/stringing'
  entityId: string; // applicationId
  onSuccess: (updated: CustomerFormValues) => void;
  onCancel: () => void;
}

export default function CustomerEditForm({ initialData, resourcePath, entityId, onSuccess, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({ defaultValues: initialData });

  async function onSubmit(data: CustomerFormValues) {
    const res = await fetch(`${resourcePath}/${entityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        addressDetail: data.addressDetail,
        postalCode: data.postalCode,
      }),
    });
    if (!res.ok) {
      // 실패 시 에러 메시지 확인
      console.error(await res.text());
      return;
    }
    onSuccess(data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">이름</Label>
        <Input id="name" {...register('name', { required: '필수 입력입니다.' })} />
        {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="email">이메일</Label>
        <Input
          id="email"
          {...register('email', {
            required: '필수 입력입니다.',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: '유효한 이메일을 입력하세요.',
            },
          })}
        />
        {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="phone">전화번호</Label>
        <Input id="phone" {...register('phone', { required: '필수 입력입니다.' })} />
        {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
      </div>

      <div>
        <Label htmlFor="address">주소</Label>
        <Textarea id="address" {...register('address', { required: '필수 입력입니다.' })} rows={2} />
        {errors.address && <p className="text-red-500 text-xs">{errors.address.message}</p>}
      </div>

      <div>
        <Label htmlFor="addressDetail">상세주소</Label>
        <Input id="addressDetail" {...register('addressDetail')} />
      </div>

      <div>
        <Label htmlFor="postalCode">우편번호</Label>
        <Input id="postalCode" {...register('postalCode')} />
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
