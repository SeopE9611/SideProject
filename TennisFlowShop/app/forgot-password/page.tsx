"use client";

import type React from "react";

import { ArrowLeft, CheckCircle, Mail, Shield } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import { showErrorToast } from "@/lib/toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 입력 중인데 아직 전송 완료 전이면 페이지 이탈 경고
  const isDirty = !isSubmitted && email.trim() !== "";
  useUnsavedChangesGuard(isDirty && !isSubmitting);
  const confirmLeaveIfDirty = () =>
    !isDirty || window.confirm(UNSAVED_CHANGES_MESSAGE);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 앞단에서 공백 정도는 한 번 걸러줍니다.
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      showErrorToast("이메일을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/forgot-password/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          json?.message || "비밀번호 재설정 메일 전송에 실패했습니다.",
        );
      }

      // 중요:
      // 서버는 "존재하는 이메일인지" 외부에 노출하지 않기 위해
      // 항상 비슷한 성공 메시지를 내려주도록 만들 예정입니다.
      setEmail(normalizedEmail);
      setIsSubmitted(true);
    } catch (error: any) {
      showErrorToast(
        error?.message || "비밀번호 재설정 메일 전송에 실패했습니다.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="absolute top-10 left-10 w-20 h-20 bg-muted/60 dark:bg-card/60 rounded-full blur-2xl animate-pulse" />
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-muted rounded-full blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center text-sm text-primary hover:text-foreground hover:underline font-medium"
            onClick={(e) => {
              if (confirmLeaveIfDirty()) return;
              e.preventDefault();
            }}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            로그인으로 돌아가기
          </Link>
        </div>

        <Card className="border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-4 md:p-6 border-b border-border bg-muted/40 text-foreground">
            <div className="relative text-center">
              <div className="w-16 h-16 mx-auto mb-4 border border-border bg-secondary rounded-xl flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">
                비밀번호 찾기
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                가입하신 이메일을 입력해주세요. 비밀번호 재설정 링크를
                보내드립니다.
              </CardDescription>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-4 md:p-6">
              {!isSubmitted ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-foreground font-medium"
                    >
                      이메일
                    </Label>

                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="example@dokkaebitennis.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="pl-10 h-12 border-border focus:border-border focus:ring-ring dark:focus:border-border bg-background"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-muted rounded-xl p-4 md:p-6 text-center border border-border">
                  <div className="w-16 h-16 mx-auto mb-4 border border-border bg-secondary text-foreground rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8" />
                  </div>

                  {/*
                    여기서도 "이메일이 실제 가입된 계정인지"를 노출하지 않도록
                    확정적 표현 대신 조건형 문구를 사용합니다.
                  */}
                  <p className="text-sm font-semibold text-primary mb-2">
                    {email}이 가입된 계정이라면 비밀번호 재설정 링크를
                    발송했습니다.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    이메일이 도착하지 않았다면 스팸함도 함께 확인해주세요.
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter className="p-4 md:p-6">
              {!isSubmitted ? (
                <Button
                  type="submit"
                  className="w-full h-12 font-semibold"
                  disabled={isSubmitting || !email.trim()}
                >
                  {isSubmitting ? "전송 중..." : "비밀번호 재설정 링크 전송"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 border-border bg-transparent hover:bg-muted"
                  onClick={() => {
                    setEmail("");
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
