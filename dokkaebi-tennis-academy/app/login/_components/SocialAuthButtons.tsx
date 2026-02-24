'use client';

import { Button } from '@/components/ui/button';

type Props = {
  onKakaoClick: () => void;
  onNaverClick?: () => void;
  onGoogleClick?: () => void;
  isRegisterMode?: boolean;
};

export default function SocialAuthButtons({ onKakaoClick, onNaverClick, onGoogleClick, isRegisterMode = false }: Props) {
  const baseButtonClass =
    'w-full h-12 bg-card border border-border text-foreground hover:bg-muted dark:hover:bg-muted font-semibold text-[15px] flex items-center justify-center gap-3 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="space-y-3">
      <Button type="button" onClick={onKakaoClick} className={`${baseButtonClass} hover:border-warning/40`}>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-warning/30 bg-warning/10 text-warning dark:bg-warning/15">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M10 3C5.58172 3 2 5.89543 2 9.5C2 11.5727 3.24291 13.3759 5.16085 14.505L4.30118 17.6447C4.21357 17.9313 4.54343 18.1597 4.78867 17.9796L8.64349 15.207C9.08573 15.2683 9.53841 15.3 10 15.3C14.4183 15.3 18 12.4046 18 8.8C18 5.19543 14.4183 2.3 10 2.3V3Z"
              fill="currentColor"
            />
          </svg>
        </span>
        {isRegisterMode ? '카카오로 3초만에 시작하기' : '카카오 로그인'}
      </Button>

      <Button type="button" onClick={onNaverClick} disabled={!onNaverClick} className={`${baseButtonClass} hover:border-success/40`}>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-success/30 bg-success/10 text-success dark:bg-success/15">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.6202 10.7393L6.91699 2H3V18H6.37983V9.26071L13.083 18H17V2H13.6202V10.7393Z" fill="currentColor" />
          </svg>
        </span>
        {isRegisterMode ? '네이버로 3초만에 시작하기' : '네이버 로그인'}
        {!onNaverClick && <span className="text-xs ml-2">(준비중)</span>}
      </Button>

      <Button type="button" onClick={onGoogleClick} disabled={!onGoogleClick} className={`${baseButtonClass} hover:border-primary/40`}>
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M18.1713 8.36791H17.5001V8.33325H10.0001V11.6666H14.7096C14.0225 13.607 12.1763 14.9999 10.0001 14.9999C7.23882 14.9999 5.00007 12.7612 5.00007 9.99992C5.00007 7.23867 7.23882 4.99992 10.0001 4.99992C11.2746 4.99992 12.4342 5.48075 13.3171 6.26617L15.6742 3.90909C14.1859 2.52217 12.1951 1.66659 10.0001 1.66659C5.39799 1.66659 1.66675 5.39784 1.66675 9.99992C1.66675 14.602 5.39799 18.3333 10.0001 18.3333C14.6022 18.3333 18.3334 14.602 18.3334 9.99992C18.3334 9.44117 18.2767 8.89575 18.1713 8.36791Z"
              fill="#FFC107"
            />
            <path
              d="M2.6275 6.12117L5.36542 8.12909C6.10625 6.29492 7.90042 4.99992 10.0004 4.99992C11.2746 4.99992 12.4342 5.48075 13.3171 6.26617L15.6742 3.90909C14.1859 2.52217 12.1954 1.66659 10.0004 1.66659C6.79917 1.66659 4.02334 3.47367 2.6275 6.12117Z"
              fill="#FF3D00"
            />
            <path
              d="M10.0004 18.3333C12.1525 18.3333 14.1083 17.5095 15.5871 16.17L13.0079 13.9875C12.1431 14.6451 11.0864 15.0008 10.0004 15C7.83291 15 5.99207 13.6179 5.29874 11.6891L2.58124 13.7829C3.96041 16.4816 6.76124 18.3333 10.0004 18.3333Z"
              fill="#4CAF50"
            />
            <path
              d="M18.1713 8.36791H17.5001V8.33325H10.0001V11.6666H14.7096C14.3809 12.5901 13.7889 13.3972 13.0067 13.9879L13.0079 13.9871L15.5871 16.1696C15.4046 16.3354 18.3334 14.1666 18.3334 9.99992C18.3334 9.44117 18.2767 8.89575 18.1713 8.36791Z"
              fill="#1976D2"
            />
          </svg>
        </span>
        {isRegisterMode ? 'Google로 3초만에 시작하기' : 'Google 로그인'}
        {!onGoogleClick && <span className="text-xs ml-2">(준비중)</span>}
      </Button>
    </div>
  );
}
