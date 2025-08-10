'use client';

import type React from 'react';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 실제 구현에서는 여기에 API 호출 로직이 들어갑니다
    // 예: await sendPasswordResetEmail(email)

    // 임시로 타이머를 사용하여 API 호출을 시뮬레이션
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  return (
    <div className="container flex min-h-[calc(100svh-200px)] items-center justify-center py-10">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link href="/login" className="inline-flex items-center text-sm text-primary hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            로그인으로 돌아가기
          </Link>
        </div>

        <Card className="border-border/40 bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">비밀번호 찾기</CardTitle>
            <CardDescription>가입하신 이메일을 입력해주세요. 비밀번호 재설정 링크를 보내드립니다.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent>
              {!isSubmitted ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input id="email" type="email" placeholder="example@dokkaebi-tennis.com" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSubmitting} className="bg-background/50" />
                  </div>
                </div>
              ) : (
                <div className="rounded-md bg-primary/10 p-4 text-center">
                  <p className="text-sm font-medium text-primary">{email}로 비밀번호 재설정 링크를 발송했습니다.</p>
                  <p className="mt-2 text-xs text-muted-foreground">이메일이 도착하지 않았다면 스팸함을 확인해주세요.</p>
                </div>
              )}
            </CardContent>

            <CardFooter>
              {!isSubmitted ? (
                <Button type="submit" className="w-full" disabled={isSubmitting || !email}>
                  {isSubmitting ? '전송 중...' : '비밀번호 재설정 링크 전송'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEmail('');
                    setIsSubmitted(false);
                  }}
                >
                  다른 이메일로 다시 시도
                </Button>
              )}
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
