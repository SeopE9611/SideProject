'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/toast';

export default function StringServiceApplyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    racketType: '',
    stringType: '',
    preferredDate: '',
    requirements: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 필수 필드 검증
    if (!formData.name || !formData.phone || !formData.racketType || !formData.stringType || !formData.preferredDate) {
      showErrorToast('필수 항목을 모두 입력해주세요.');
      return;
    }

    // 전화번호 형식 검증
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phoneRegex.test(formData.phone)) {
      showErrorToast('연락처를 올바른 형식으로 입력해주세요. (예: 01012345678)');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/applications/stringing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || '신청 실패');
      }

      toast.success('신청이 완료되었습니다!');
      router.push('/services/success');
    } catch (error) {
      showErrorToast('신청서 제출 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">스트링 장착 서비스 신청</CardTitle>
            <CardDescription className="text-center text-gray-600">전문가가 직접 라켓에 스트링을 장착해드립니다. 신청서를 작성해주시면 빠르게 연락드리겠습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 신청인 이름 */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  신청인 이름 <span className="text-red-500">*</span>
                </Label>
                <Input id="name" name="name" type="text" value={formData.name} onChange={handleInputChange} placeholder="이름을 입력해주세요" required className="w-full" />
              </div>

              {/* 연락처 */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  연락처 <span className="text-red-500">*</span>
                </Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} placeholder="010-1234-5678" required className="w-full" />
              </div>

              {/* 라켓 종류 */}
              <div className="space-y-2">
                <Label htmlFor="racketType" className="text-sm font-medium">
                  라켓 종류 <span className="text-red-500">*</span>
                </Label>
                <Input id="racketType" name="racketType" type="text" value={formData.racketType} onChange={handleInputChange} placeholder="예: 윌슨 프로 스태프 97" required className="w-full" />
              </div>

              {/* 스트링 종류 */}
              <div className="space-y-2">
                <Label htmlFor="stringType" className="text-sm font-medium">
                  스트링 종류 <span className="text-red-500">*</span>
                </Label>
                <Input id="stringType" name="stringType" type="text" value={formData.stringType} onChange={handleInputChange} placeholder="예: 바볼랏 RPM 블라스트" required className="w-full" />
              </div>

              {/* 장착 희망일 */}
              <div className="space-y-2">
                <Label htmlFor="preferredDate" className="text-sm font-medium">
                  장착 희망일 <span className="text-red-500">*</span>
                </Label>
                <Input id="preferredDate" name="preferredDate" type="date" value={formData.preferredDate} onChange={handleInputChange} required className="w-full" min={new Date().toISOString().split('T')[0]} />
              </div>

              {/* 요청사항 */}
              <div className="space-y-2">
                <Label htmlFor="requirements" className="text-sm font-medium">
                  요청사항
                </Label>
                <Textarea id="requirements" name="requirements" value={formData.requirements} onChange={handleInputChange} placeholder="요청사항이 있다면 작성해주세요" rows={4} className="w-full resize-none" />
              </div>

              {/* 제출 버튼 */}
              <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg font-medium">
                {isSubmitting ? '신청서 제출 중...' : '신청서 제출하기'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
