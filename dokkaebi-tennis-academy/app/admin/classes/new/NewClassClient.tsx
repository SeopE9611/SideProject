'use client';

import type React from 'react';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';

// 임시 강사 데이터
const instructors = [
  { id: '1', name: '김재민', specialty: '성인반' },
  { id: '2', name: '김재민', specialty: '주니어반' },
  { id: '3', name: '김재민', specialty: '주말반' },
];

// 임시 장소 데이터
const locations = [
  { id: '1', name: '실내 코트 A' },
  { id: '2', name: '실내 코트 B' },
  { id: '3', name: '실내 코트 C' },
  { id: '4', name: '실외 코트 A' },
  { id: '5', name: '실외 코트 B' },
];

export default async function NewClassClient() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  const [formData, setFormData] = useState({
    name: '',
    instructor: '',
    schedule: '',
    capacity: '',
    level: '초급',
    location: '',
    description: '',
    status: true, // true: 모집 중, false: 마감
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 폼 입력값 변경 처리
  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 폼 제출 처리
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 폼 데이터 로깅 (실제 구현에서는 API 호출로 대체)
    console.log('제출된 클래스 정보:', formData);

    // 잠시 후 제출 상태 해제 (실제 구현에서는 API 응답 후 처리)
    setTimeout(() => {
      setIsSubmitting(false);
      // 성공 시 목록 페이지로 리디렉션 (실제 구현에서 활성화)
      // router.push('/admin/classes')
    }, 1000);
  };

  // 모든 필수 필드가 채워졌는지 확인
  const isFormValid = () => {
    return formData.name.trim() !== '' && formData.instructor !== '' && formData.schedule.trim() !== '' && formData.capacity.trim() !== '' && formData.location !== '';
  };

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-2xl">
        {/* 뒤로 가기 링크 */}
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="gap-1">
            <Link href="/admin/classes">
              <ArrowLeft className="h-4 w-4" />
              클래스 목록으로 돌아가기
            </Link>
          </Button>
        </div>

        {/* 클래스 등록 폼 */}
        <Card className="border-border/40 bg-card/60 backdrop-blur">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-2xl">클래스 등록</CardTitle>
              <CardDescription>새로운 테니스 클래스 정보를 입력해주세요.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* 클래스명 */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  클래스명 <span className="text-red-500">*</span>
                </Label>
                <Input id="name" placeholder="예: 성인반, 주니어반" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required />
              </div>

              {/* 강사 선택 */}
              <div className="space-y-2">
                <Label htmlFor="instructor" className="text-sm font-medium">
                  강사 <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.instructor} onValueChange={(value) => handleChange('instructor', value)} required>
                  <SelectTrigger id="instructor">
                    <SelectValue placeholder="강사를 선택해주세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        <div className="flex flex-col">
                          <span>{instructor.name}</span>
                          <span className="text-xs text-muted-foreground">{instructor.specialty}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 요일 및 시간 */}
              <div className="space-y-2">
                <Label htmlFor="schedule" className="text-sm font-medium">
                  요일 및 시간 <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input id="schedule" placeholder="예: 월/수/금 10:00-12:00" value={formData.schedule} onChange={(e) => handleChange('schedule', e.target.value)} required />
                </div>
              </div>

              {/* 정원 */}
              <div className="space-y-2">
                <Label htmlFor="capacity" className="text-sm font-medium">
                  정원 <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Input id="capacity" type="number" min="1" placeholder="예: 10" value={formData.capacity} onChange={(e) => handleChange('capacity', e.target.value)} required />
                  <span className="text-sm text-muted-foreground">명</span>
                </div>
              </div>

              {/* 난이도 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">난이도</Label>
                <RadioGroup value={formData.level} onValueChange={(value) => handleChange('level', value)} className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="초급" id="level-beginner" />
                    <Label htmlFor="level-beginner" className="cursor-pointer">
                      초급
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="중급" id="level-intermediate" />
                    <Label htmlFor="level-intermediate" className="cursor-pointer">
                      중급
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="상급" id="level-advanced" />
                    <Label htmlFor="level-advanced" className="cursor-pointer">
                      상급
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* 장소 */}
              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-medium">
                  장소 <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Select value={formData.location} onValueChange={(value) => handleChange('location', value)} required>
                    <SelectTrigger id="location">
                      <SelectValue placeholder="장소를 선택해주세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 클래스 설명 */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  클래스 설명
                </Label>
                <Textarea id="description" placeholder="클래스에 대한 상세 설명을 입력해주세요." rows={4} value={formData.description} onChange={(e) => handleChange('description', e.target.value)} />
              </div>

              {/* 상태 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="status" className="text-sm font-medium">
                    상태
                  </Label>
                  <p className="text-xs text-muted-foreground">클래스 모집 상태를 설정합니다.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="status" checked={formData.status} onCheckedChange={(checked: boolean) => handleChange('status', checked)} />
                  <Label htmlFor="status" className="cursor-pointer">
                    {formData.status ? '모집 중' : '마감'}
                  </Label>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:space-x-4 sm:space-y-0">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => window.history.back()}>
                취소
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || !isFormValid()}>
                {isSubmitting ? '등록 중...' : '클래스 등록'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
