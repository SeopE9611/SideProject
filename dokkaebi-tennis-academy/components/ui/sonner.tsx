// Toaster.tsx
'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      position="top-center"
      toastOptions={{
        // ↓ 기존 스타일 + white-space, maxWidth 설정만 추가
        className: [
          'bg-red-600/10', // 연한 빨강 배경
          'border border-red-600',
          'rounded-lg',
          'shadow-lg',
          'py-4 px-6',
        ].join(' '),
        style: {
          fontSize: '16px',
          fontWeight: 'bold',
          lineHeight: '1.5',
          whiteSpace: 'pre', // ← “오직 '\n'에서만 줄바꿈”, 그 외에는 한 줄 유지
          maxWidth: 'none', // ← 자동으로 잘리지 않도록 폭 제한 해제
        },
        duration: 5000,
      }}
      {...props}
    />
  );
};

export { Toaster };
