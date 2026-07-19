"use client";

import type React from "react";
import { ArrowLeft, CheckCircle, KeyRound, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AuthShell } from "@/components/public";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

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
    if (!trimmed) return "새 비밀번호를 입력해주세요.";
    if (!PASSWORD_POLICY_RE.test(trimmed)) return "비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.";
    if (!confirmPassword.trim()) return "비밀번호 확인을 입력해주세요.";
    if (trimmed !== confirmPassword) return "비밀번호 확인이 일치하지 않습니다.";
    return null;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalidLink) { showErrorToast("유효한 비밀번호 재설정 링크가 아닙니다."); return; }
    const validationMessage = validate();
    if (validationMessage) { showErrorToast(validationMessage); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/forgot-password/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, newPassword: newPassword.trim() }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "비밀번호 재설정에 실패했습니다.");
      showSuccessToast("비밀번호가 재설정되었습니다.");
      setIsDone(true);
    } catch (error: any) { showErrorToast(error?.message || "비밀번호 재설정에 실패했습니다.");
    } finally { setIsSubmitting(false); }
  };

  if (isInvalidLink) return <AuthShell variant="feature" title="유효하지 않은 링크" description="비밀번호 재설정 토큰이 없거나 잘못된 접근입니다."><div className="space-y-3 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-warning/30 bg-warning/10 text-warning"><ShieldAlert aria-hidden="true" className="h-8 w-8" /></div><p className="break-keep text-ui-body-sm text-muted-foreground">새 링크가 필요하면 비밀번호 재설정을 다시 요청해주세요.</p><Button asChild className="h-12 w-full rounded-control"><Link href="/forgot-password">비밀번호 재설정 다시 요청</Link></Button><Button asChild variant="outline" className="h-12 w-full rounded-control"><Link href="/login">로그인으로 이동</Link></Button></div></AuthShell>;

  const backLink = <Link href="/login" className="inline-flex items-center text-ui-label font-medium text-muted-foreground hover:text-foreground hover:underline" onClick={(e) => { if (confirmLeaveIfDirty()) return; e.preventDefault(); }}><ArrowLeft aria-hidden="true" className="mr-2 h-4 w-4" />로그인으로 돌아가기</Link>;
  return <AuthShell variant="feature" title={<span className="inline-flex items-center gap-2"><KeyRound aria-hidden="true" className="h-6 w-6 text-brand-highlight-ink" />새 비밀번호 설정</span>} description="새 비밀번호를 입력한 뒤 저장해주세요." footer={backLink}>
    {!isDone ? <form onSubmit={handleSubmit} className="space-y-5"><div className="space-y-3 rounded-control border border-border bg-brand-highlight-muted/35 p-4 text-ui-body-sm text-muted-foreground"><p className="text-ui-label font-semibold text-brand-highlight-ink">ACCOUNT RECOVERY</p><p className="font-semibold text-foreground">계정 복구를 안전하게 완료하세요</p><p className="break-keep leading-relaxed">새 비밀번호는 8자 이상이며 영문과 숫자를 포함해야 합니다.</p></div><div className="space-y-2"><Label htmlFor="newPassword">새 비밀번호</Label><Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="8자 이상, 영문 + 숫자 포함" disabled={isSubmitting} className="h-12 rounded-control" /></div><div className="space-y-2"><Label htmlFor="confirmPassword">새 비밀번호 확인</Label><Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="비밀번호를 한 번 더 입력해주세요" disabled={isSubmitting} className="h-12 rounded-control" /></div><Button type="submit" className="h-12 w-full rounded-control" disabled={isSubmitting}>{isSubmitting ? <><Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />저장 중...</> : "비밀번호 저장"}</Button></form> : <div className="space-y-5"><div className="rounded-panel border border-success/30 bg-success/10 p-4 text-center md:p-6"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success text-success-foreground"><CheckCircle aria-hidden="true" className="h-8 w-8" /></div><p className="mb-2 text-ui-body-sm font-semibold text-foreground">비밀번호가 성공적으로 변경되었습니다.</p><p className="text-ui-label text-muted-foreground">이제 새 비밀번호로 로그인하실 수 있습니다.</p></div><Button type="button" className="h-12 w-full rounded-control" onClick={() => router.push("/login")}>로그인 페이지로 이동</Button></div>}
  </AuthShell>;
}
