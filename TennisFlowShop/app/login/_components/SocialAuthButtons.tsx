"use client";

import { Button } from "@/components/ui/button";

type Props = { onKakaoClick: () => void; onNaverClick?: () => void; onGoogleClick?: () => void; isRegisterMode?: boolean };

export default function SocialAuthButtons({ onKakaoClick, onNaverClick, onGoogleClick, isRegisterMode = false }: Props) {
  const baseButtonClass = "h-12 w-full justify-start rounded-control border border-border bg-card px-4 text-ui-body-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-brand-highlight-muted/50 disabled:cursor-not-allowed disabled:opacity-50";
  const iconClass = "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-control bg-brand-highlight-muted text-brand-highlight-ink";
  return <div className="space-y-2.5">
    <Button type="button" onClick={onKakaoClick} className={baseButtonClass}>
      <span className={iconClass}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 3C5.58172 3 2 5.89543 2 9.5C2 11.5727 3.24291 13.3759 5.16085 14.505L4.30118 17.6447C4.21357 17.9313 4.54343 18.1597 4.78867 17.9796L8.64349 15.207C9.08573 15.2683 9.53841 15.3 10 15.3C14.4183 15.3 18 12.4046 18 8.8C18 5.19543 14.4183 2.3 10 2.3V3Z" fill="currentColor" /></svg></span>
      <span className="flex-1 text-center">{isRegisterMode ? "카카오로 3초만에 시작하기" : "카카오 로그인"}</span>
    </Button>
    {onNaverClick ? <Button type="button" onClick={onNaverClick} className={baseButtonClass}><span className={iconClass}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.6202 10.7393L6.91699 2H3V18H6.37983V9.26071L13.083 18H17V2H13.6202V10.7393Z" fill="currentColor" /></svg></span><span className="flex-1 text-center">{isRegisterMode ? "네이버로 3초만에 시작하기" : "네이버 로그인"}</span></Button> : null}
    {onGoogleClick ? <Button type="button" onClick={onGoogleClick} className={baseButtonClass}><span className={iconClass}>G</span><span className="flex-1 text-center">{isRegisterMode ? "Google로 3초만에 시작하기" : "Google 로그인"}</span></Button> : null}
  </div>;
}
