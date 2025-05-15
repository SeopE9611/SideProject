'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function OrderLookupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      name: '',
      email: '',
    };
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      console.log('주문 조회 요청:', formData);

      // 성공 시 주문 결과 페이지로 이동 (예시)
      // router.push(`/order-results?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`)

      // 임시로 3초 후 완료되는 것으로 시뮬레이션
      const res = await fetch('/api/guest-orders/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success && data.orders.length > 0) {
        alert(`총 ${data.orders.length}개의 주문을 찾았습니다.`);
        router.push(`/order-lookup/results?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}&phone=${encodeURIComponent(formData.phone)}`);
      } else {
        alert('조회된 주문이 없습니다.');
      }
    } catch (error) {
      console.error('주문 조회 중 오류 발생:', error);
      alert('주문 조회 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 md:px-6">
      <div className="max-w-md mx-auto">
        <Card className="shadow-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">비회원 주문 조회</CardTitle>
            <CardDescription className="text-center">주문 시 입력하신 정보를 통해 주문 내역을 확인하실 수 있습니다.</CardDescription>
          </CardHeader>
          <Separator />
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  이름 <span className="text-red-500">*</span>
                </Label>
                <Input id="name" name="name" placeholder="홍길동" value={formData.name} onChange={handleChange} required className={errors.name ? 'border-red-500' : ''} />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  이메일 <span className="text-red-500">*</span>
                </Label>
                <Input id="email" name="email" type="email" placeholder="example@dokkaebi.com" value={formData.email} onChange={handleChange} required className={errors.email ? 'border-red-500' : ''} />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="phone">전화번호 (선택)</Label>
                </div>
                <Input id="phone" name="phone" type="tel" placeholder="010-1234-5678" value={formData.phone} onChange={handleChange} />
                <p className="text-xs text-muted-foreground">주문 시 입력하신 전화번호를 입력해주세요.</p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col">
              <Button type="submit" size="lg" className="w-full font-semibold" disabled={isSubmitting}>
                {isSubmitting ? '조회 중...' : '주문 조회하기'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
