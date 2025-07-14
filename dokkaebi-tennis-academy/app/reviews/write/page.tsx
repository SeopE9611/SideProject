'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTokenRefresher } from '@/app/api/auth/useTokenRefresher';

export default function ReviewWritePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'academy';

  const [formData, setFormData] = useState({
    name: '',
    rating: '',
    program: '',
    content: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 타입에 따른 페이지 제목과 라벨 설정
  const pageTitle = type === 'academy' ? '아카데미 후기 작성' : '스트링 서비스 후기 작성';
  const programLabel = type === 'academy' ? '프로그램명' : '장착 서비스 유형';
  const contentLabel = type === 'academy' ? '레슨 후기' : '스트링 후기';

  // 프로그램 또는 서비스 옵션
  const programOptions = type === 'academy' ? ['성인반', '주니어반', '주말 집중반'] : ['스트링 장착 (스트링 미포함)', '스트링 장착 (스트링 포함)', '하이브리드 장착', '급행 서비스'];

  // 입력값 변경 처리
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 폼 제출 처리
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 폼 데이터 로깅 (실제 구현에서는 API 호출로 대체)
    console.log('제출된 후기:', {
      type,
      ...formData,
    });

    // 잠시 후 리뷰 페이지로 리디렉션
    setTimeout(() => {
      router.push('/reviews');
    }, 1000);
  };

  // 별점 선택 UI 컴포넌트
  const RatingSelector = () => {
    const [hoveredRating, setHoveredRating] = useState(0);
    const [selectedRating, setSelectedRating] = useState(Number.parseInt(formData.rating) || 0);

    const handleRatingClick = (rating: number) => {
      setSelectedRating(rating);
      handleChange('rating', rating.toString());
    };

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button key={rating} type="button" className="focus:outline-none" onMouseEnter={() => setHoveredRating(rating)} onMouseLeave={() => setHoveredRating(0)} onClick={() => handleRatingClick(rating)}>
            <Star className={`h-8 w-8 ${rating <= (hoveredRating || selectedRating) ? 'fill-[#fbbf24] text-[#fbbf24]' : 'fill-muted text-muted-foreground'} transition-colors`} />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="container py-8">
      <div className="mb-4">
        <Link href="/reviews" className="inline-flex items-center text-primary hover:underline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          후기 목록으로 돌아가기
        </Link>
      </div>

      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{pageTitle}</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input id="name" placeholder="이름을 입력하세요" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="program">{programLabel}</Label>
                <Select value={formData.program} onValueChange={(value) => handleChange('program', value)} required>
                  <SelectTrigger>
                    <SelectValue placeholder={`${programLabel} 선택`} />
                  </SelectTrigger>
                  <SelectContent>
                    {programOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>별점</Label>
                <RatingSelector />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">{contentLabel}</Label>
                <Textarea id="content" placeholder="후기 내용을 입력하세요" className="min-h-[150px]" value={formData.content} onChange={(e) => handleChange('content', e.target.value)} required />
              </div>
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" asChild>
                <Link href="/reviews">취소</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '제출 중...' : '후기 등록하기'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
