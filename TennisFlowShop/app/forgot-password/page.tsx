"use client";

import type React from "react";

import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AuthShell } from "@/components/public";
import { Button } from "@/components/ui/button";
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
  const confirmLeaveIfDirty = () => !isDirty || window.confirm(UNSAVED_CHANGES_MESSAGE);

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
        throw new Error(json?.message || "비밀번호 재설정 메일 전송에 실패했습니다.");
      }

      // 중요:
      // 서버는 "존재하는 이메일인지" 외부에 노출하지 않기 위해
      // 항상 비슷한 성공 메시지를 내려주도록 만들 예정입니다.
      setEmail(normalizedEmail);
      setIsSubmitted(true);
    } catch (error: any) {
      showErrorToast(error?.message || "비밀번호 재설정 메일 전송에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const backLink = (
    <Link
      href="/login"
      className="inline-flex items-center text-ui-label font-medium text-muted-foreground hover:text-foreground hover:underline"
      onClick={(e) => {
        if (confirmLeaveIfDirty()) return;
        e.preventDefault();
      }}
    >
      <ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />
      로그인으로 돌아가기
    </Link>
  );

  return (
    <AuthShell
      title="비밀번호 찾기"
      description="가입하신 이메일을 입력해주세요. 비밀번호 재설정 링크를 보내드립니다."
      footer={backLink}
      variant="feature"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {!isSubmitted ? (
          <div className="space-y-2">
            <Label htmlFor="email" className="text-ui-label font-medium text-foreground">
              이메일
            </Label>

            <div className="relative">
              <Mail aria-hidden="true" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="example@dokkaebitennis.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="h-12 rounded-control border-border bg-background pl-10 focus:border-border focus:ring-ring dark:focus:border-border"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-panel border border-success/30 bg-success/10 p-4 text-center md:p-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success text-success-foreground">
              <CheckCircle aria-hidden="true" className="h-8 w-8" />
            </div>

            {/*
              여기서도 "이메일이 실제 가입된 계정인지"를 노출하지 않도록
              확정적 표현 대신 조건형 문구를 사용합니다.
            */}
            <p className="mb-2 text-ui-body-sm font-semibold text-foreground">
              {email}이 가입된 계정이라면 비밀번호 재설정 링크를 발송했습니다.
            </p>
            <p className="text-ui-label text-muted-foreground">
              이메일이 도착하지 않았다면 스팸함도 함께 확인해주세요.
            </p>
          </div>
        )}

        {!isSubmitted ? (
          <Button
            type="submit"
            className="h-12 w-full rounded-control font-semibold"
            disabled={isSubmitting || !email.trim()}
          >
            {isSubmitting ? "전송 중..." : "비밀번호 재설정 링크 전송"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-control border-border bg-transparent hover:bg-muted"
            onClick={() => {
              setEmail("");
              setIsSubmitted(false);
            }}
          >
            다른 이메일로 다시 시도
          </Button>
        )}
      </form>
    </AuthShell>
  );
}
