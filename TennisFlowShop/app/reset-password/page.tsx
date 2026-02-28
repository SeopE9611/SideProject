'use client';

import type React from 'react';

import { ArrowLeft, CheckCircle, KeyRound, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

// 기존 프로젝트의 비밀번호 정책과 최대한 맞춰서 갑니다.
// 8자 이상 + 영문 + 숫자 포함
const PASSWORD_POLICY_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const isInvalidLink = useMemo(() => !token.trim(), [token]);

  const isDirty = !isDone && (newPassword.trim() !== '' || confirmPassword.trim() !== '');
  useUnsavedChangesGuard(isDirty && !isSubmitting);

  const validate = () => {
    const trimmed = newPassword.trim();

    if (!trimmed) {
      return '새 비밀번호를 입력해주세요.';
    }

    if (!PASSWORD_POLICY_RE.test(trimmed)) {
      return '비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.';
    }

    if (!confirmPassword.trim()) {
      return '비밀번호 확인을 입력해주세요.';
    }

    if (trimmed !== confirmPassword) {
      return '비밀번호 확인이 일치하지 않습니다.';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isInvalidLink) {
      showErrorToast('유효한 비밀번호 재설정 링크가 아닙니다.');
      return;
    }

    const validationMessage = validate();
    if (validationMessage) {
      showErrorToast(validationMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/forgot-password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: newPassword.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.message || '비밀번호 재설정에 실패했습니다.');
      }

      showSuccessToast('비밀번호가 재설정되었습니다.');
      setIsDone(true);
    } catch (error: any) {
      showErrorToast(error?.message || '비밀번호 재설정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInvalidLink) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-0 bg-card/95 dark:bg-card backdrop-blur-sm shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-primary/20 bg-primary/10 dark:bg-primary/20 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <ShieldAlert className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold">유효하지 않은 링크</CardTitle>
              <CardDescription className="text-muted-foreground mt-2">비밀번호 재설정 토큰이 없거나 잘못된 접근입니다.</CardDescription>
            </div>

            <CardFooter className="p-6 flex flex-col gap-3">
              <Button asChild className="w-full">
                <Link href="/forgot-password">비밀번호 재설정 다시 요청</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">로그인으로 이동</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="mb-6">
          <Link href="/login" className="inline-flex items-center text-sm text-primary hover:text-primary dark:hover:text-primary hover:underline font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" />
            로그인으로 돌아가기
          </Link>
        </div>

        <Card className="border-0 bg-card/95 dark:bg-card backdrop-blur-sm shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-primary/20 bg-primary/10 dark:bg-primary/20 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
              <KeyRound className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">새 비밀번호 설정</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">새 비밀번호를 입력한 뒤 저장해주세요.</CardDescription>
          </div>

          {!isDone ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">새 비밀번호</Label>
                  <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8자 이상, 영문 + 숫자 포함" disabled={isSubmitting} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
                  <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="비밀번호를 한 번 더 입력해주세요" disabled={isSubmitting} />
                </div>
              </CardContent>

              <CardFooter className="p-6">
                <Button type="submit" className="w-full h-12" disabled={isSubmitting}>
                  {isSubmitting ? '저장 중...' : '비밀번호 저장'}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <>
              <CardContent className="p-6">
                <div className="bg-muted rounded-xl p-6 text-center border border-border">
                  <div className="w-16 h-16 mx-auto mb-4 border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <p className="text-sm font-semibold text-primary mb-2">비밀번호가 성공적으로 변경되었습니다.</p>
                  <p className="text-xs text-muted-foreground">이제 새 비밀번호로 로그인하실 수 있습니다.</p>
                </div>
              </CardContent>

              <CardFooter className="p-6">
                <Button type="button" className="w-full h-12" onClick={() => router.push('/login')}>
                  로그인 페이지로 이동
                </Button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
