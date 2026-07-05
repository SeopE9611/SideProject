"use client";

import type React from "react";

import { ArrowLeft, CheckCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { AuthShell } from "@/components/public";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

// 기존 프로젝트의 비밀번호 정책과 최대한 맞춰서 갑니다.
// 8자 이상 + 영문 + 숫자 포함
const PASSWORD_POLICY_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const isInvalidLink = useMemo(() => !token.trim(), [token]);

  const isDirty = !isDone && (newPassword.trim() !== "" || confirmPassword.trim() !== "");
  useUnsavedChangesGuard(isDirty && !isSubmitting);
  const confirmLeaveIfDirty = () => !isDirty || window.confirm(UNSAVED_CHANGES_MESSAGE);

  const validate = () => {
    const trimmed = newPassword.trim();

    if (!trimmed) {
      return "새 비밀번호를 입력해주세요.";
    }

    if (!PASSWORD_POLICY_RE.test(trimmed)) {
      return "비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.";
    }

    if (!confirmPassword.trim()) {
      return "비밀번호 확인을 입력해주세요.";
    }

    if (trimmed !== confirmPassword) {
      return "비밀번호 확인이 일치하지 않습니다.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isInvalidLink) {
      showErrorToast("유효한 비밀번호 재설정 링크가 아닙니다.");
      return;
    }

    const validationMessage = validate();
    if (validationMessage) {
      showErrorToast(validationMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/forgot-password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword: newPassword.trim(),
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.message || "비밀번호 재설정에 실패했습니다.");
      }

      showSuccessToast("비밀번호가 재설정되었습니다.");
      setIsDone(true);
    } catch (error: any) {
      showErrorToast(error?.message || "비밀번호 재설정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInvalidLink) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 border-b border-border bg-muted/30 text-center">
              <div className="w-16 h-16 mx-auto mb-4 border border-border bg-secondary rounded-xl flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-foreground" />
              </div>
              <CardTitle className="text-ui-card-title-lg font-semibold">
                유효하지 않은 링크
              </CardTitle>
              <CardDescription className="mt-2 text-ui-body-sm text-muted-foreground">
                비밀번호 재설정 토큰이 없거나 잘못된 접근입니다.
              </CardDescription>
            </div>

            <CardFooter className="p-4 md:p-6 flex flex-col gap-3">
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

  const backLink = (
    <Link
      href="/login"
      className="inline-flex items-center text-ui-label font-medium text-muted-foreground hover:text-foreground hover:underline"
      onClick={(e) => {
        if (confirmLeaveIfDirty()) return;
        e.preventDefault();
      }}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      로그인으로 돌아가기
    </Link>
  );

  return (
    <AuthShell
      title="새 비밀번호 설정"
      description="새 비밀번호를 입력한 뒤 저장해주세요."
      footer={backLink}
    >
      {!isDone ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3 text-ui-body-sm text-muted-foreground">
            <p className="text-ui-label font-semibold text-primary">ACCOUNT RECOVERY</p>
            <p className="text-ui-body-sm font-semibold text-foreground">
              계정 복구를 안전하게 완료하세요
            </p>
            <p className="break-keep leading-relaxed">
              새 비밀번호는 기존 비밀번호와 구분되도록 설정하고, 저장 후에는 로그인 화면에서 다시
              인증해주세요.
            </p>
            <div className="grid gap-2">
              <div className="rounded-lg border border-border bg-background/60 p-2">
                8자 이상, 영문과 숫자 포함
              </div>
              <div className="rounded-lg border border-border bg-background/60 p-2">
                재설정 링크가 유효하지 않으면 다시 요청
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8자 이상, 영문 + 숫자 포함"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="비밀번호를 한 번 더 입력해주세요"
              disabled={isSubmitting}
            />
          </div>

          <Button type="submit" className="h-12 w-full" disabled={isSubmitting}>
            {isSubmitting ? "저장 중..." : "비밀번호 저장"}
          </Button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-muted p-4 text-center md:p-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-secondary text-foreground">
              <CheckCircle className="h-8 w-8" />
            </div>
            <p className="mb-2 text-ui-body-sm font-semibold text-foreground">
              비밀번호가 성공적으로 변경되었습니다.
            </p>
            <p className="text-ui-label text-muted-foreground">
              이제 새 비밀번호로 로그인하실 수 있습니다.
            </p>
          </div>

          <Button type="button" className="h-12 w-full" onClick={() => router.push("/login")}>
            로그인 페이지로 이동
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
