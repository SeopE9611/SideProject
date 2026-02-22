'use client';

import type React from 'react';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 입력이 있고(초기값 대비 변경), 아직 제출 완료 전이면 이탈 경고
  const isDirty = !isSubmitted && email.trim() !== '';
  useUnsavedChangesGuard(isDirty && !isSubmitting);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // 실제 구현에서는 여기에 API 호출 로직
    // 예: await sendPasswordResetEmail(email)

    // 임시로 타이머를 사용하여 API 호출을 시뮬레이션
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-card dark:from-background dark:via-muted dark:to-card flex items-center justify-center p-4">
      <div className="absolute top-10 left-10 w-20 h-20 bg-primary rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-success/10 rounded-full blur-3xl animate-pulse"></div>

      <div className="relative w-full max-w-md">
        <div className="mb-6">
          <Link href="/login" className="inline-flex items-center text-sm text-primary hover:text-primary dark:hover:text-primary hover:underline font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" />
            로그인으로 돌아가기
          </Link>
        </div>

        <Card className="border-0 bg-card/95 dark:bg-card backdrop-blur-sm shadow-2xl overflow-hidden">
          <div className="bg-primary p-6 text-primary-foreground relative">
            <div className="absolute inset-0 bg-overlay/10"></div>
            <div className="relative text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-card/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold text-primary-foreground">비밀번호 찾기</CardTitle>
              <CardDescription className="text-primary-foreground/80 mt-2">가입하신 이메일을 입력해주세요. 비밀번호 재설정 링크를 보내드립니다.</CardDescription>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6">
              {!isSubmitted ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground font-medium">
                      이메일
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@dokkaebi-tennis.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="pl-10 h-12 border-border focus:border-border focus:ring-ring dark:focus:border-border bg-card/50 dark:bg-muted"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-muted rounded-xl p-6 text-center border border-border">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <p className="text-sm font-semibold text-primary mb-2">{email}로 비밀번호 재설정 링크를 발송했습니다.</p>
                  <p className="text-xs text-muted-foreground">이메일이 도착하지 않았다면 스팸함을 확인해주세요.</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="p-6">
              {!isSubmitted ? (
                <Button
                  type="submit"
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isSubmitting || !email}
                >
                  {isSubmitting ? '전송 중...' : '비밀번호 재설정 링크 전송'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-border text-primary hover:bg-primary dark:hover:bg-primary bg-transparent"
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
