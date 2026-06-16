"use client";

import { Mail, ShieldCheck, User } from "lucide-react";

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export default function UserSection({ user }: Props) {
  if (!user) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm bp-sm:p-6 bp-lg:p-7">
      <div className="flex min-w-0 flex-col gap-5 bp-sm:flex-row bp-sm:items-center bp-sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="shrink-0 rounded-2xl border border-border bg-muted p-3">
            <User className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium text-primary">내 계정 요약</p>
            <h1 className="break-keep text-2xl font-semibold tracking-tight text-foreground bp-sm:text-3xl">
              {user.name ?? "회원"}님, 안녕하세요.
            </h1>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <span className="flex min-w-0 items-center gap-1.5">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-all">
                  {user.email || "이메일 없음"}
                </span>
              </span>
              <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {user.role === "ADMIN" ? "관리자 계정" : "일반 계정"}
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground bp-sm:max-w-[260px]">
          주문, 서비스 신청, 클래스, 포인트 내역을 한 곳에서 확인할 수 있습니다.
        </div>
      </div>
    </section>
  );
}
