'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState } from 'react';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

interface CustomerFormValues {
  name: string;
  email: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
}

interface Props {
  initialData: CustomerFormValues;
  orderId?: string;
  entityId?: string;
  resourcePath: string;
  onSuccess: (updated: CustomerFormValues) => void;
  onCancel: () => void;
}

export default function CustomerEditForm({ initialData, orderId, resourcePath, onSuccess, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CustomerFormValues>({
    defaultValues: {
      ...initialData,
      addressDetail: initialData.addressDetail || '',
    },
  });

  // 입력값이 변경되면(=dirty) 뒤로가기/링크이동/탭닫기 시 경고
  useUnsavedChangesGuard(isDirty);

  // 다음 주소 API
  const [daumReady, setDaumReady] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).daum?.Postcode) {
      setDaumReady(true);
    }
  }, []);

  // 우편번호 검색 팝업
  const handleOpenPostcode = () => {
    if (!daumReady) return;
    new (window as any).daum.Postcode({
      oncomplete: (data: any) => {
        // setValue는 기본값으론 dirty로 안 잡힐 수 있어서 shouldDirty: true를 명시
        setValue('postalCode', data.zonecode, { shouldDirty: true });
        setValue('address', data.roadAddress, { shouldDirty: true });
        setValue('addressDetail', '', { shouldDirty: true }); // 상세주소는 비워두기
      },
    }).open();
  };

  async function onSubmit(data: CustomerFormValues) {
    const url = `${resourcePath}/${orderId}`;
    const res = await fetch(url, {
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
        {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium">이메일</label>
        <Input
          {...register('email', {
            required: '필수 입력입니다.',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: '유효한 이메일을 입력하세요.' },
          })}
        />
        {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium">전화번호</label>
        <Input {...register('phone', { required: '필수 입력입니다.' })} />
      </div>
      <div>
        <label className="block text-sm font-medium">우편번호</label>
        <div className="flex gap-2">
          <Input readOnly {...register('postalCode', { required: '필수 입력입니다.' })} />
          <Button type="button" size="sm" onClick={handleOpenPostcode}>
            주소 검색
          </Button>
        </div>
        {errors.postalCode && <p className="text-destructive text-xs">{errors.postalCode.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium">기본 주소</label>
        <Textarea readOnly {...register('address', { required: '필수 입력입니다.' })} rows={2} />
        {errors.address && <p className="text-destructive text-xs">{errors.address.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium">상세 주소</label>
        <Input {...register('addressDetail')} placeholder="예: 101호, 건물명" />
      </div>
      <div className="flex justify-end gap-2">
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
