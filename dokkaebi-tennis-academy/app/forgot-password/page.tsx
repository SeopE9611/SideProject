'use client';

import type React from 'react';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardTitle } from '@/components/ui/card';
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-900/20 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/tennis-court-background.png')] opacity-5 bg-cover bg-center"></div>
      <div className="absolute top-10 left-10 w-20 h-20 bg-emerald-400/20 rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-green-400/10 rounded-full blur-3xl animate-pulse"></div>

      <div className="relative w-full max-w-md">
        <div className="mb-6">
          <Link href="/login" className="inline-flex items-center text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline font-medium">
            <ArrowLeft className="mr-2 h-4 w-4" />
            로그인으로 돌아가기
          </Link>
        </div>

        <Card className="border-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-700 p-6 text-white relative">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">비밀번호 찾기</CardTitle>
              <CardDescription className="text-emerald-100 mt-2">가입하신 이메일을 입력해주세요. 비밀번호 재설정 링크를 보내드립니다.</CardDescription>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6">
              {!isSubmitted ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">
                      이메일
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@dokkaebi-tennis.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="pl-10 h-12 border-slate-200 dark:border-slate-600 focus:border-emerald-500 focus:ring-emerald-500 dark:focus:border-emerald-400 bg-white/50 dark:bg-slate-700/50"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-6 text-center border border-emerald-200/50 dark:border-emerald-800/50">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2">{email}로 비밀번호 재설정 링크를 발송했습니다.</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">이메일이 도착하지 않았다면 스팸함을 확인해주세요.</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="p-6">
              {!isSubmitted ? (
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={isSubmitting || !email}
                >
                  {isSubmitting ? '전송 중...' : '비밀번호 재설정 링크 전송'}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 bg-transparent"
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
