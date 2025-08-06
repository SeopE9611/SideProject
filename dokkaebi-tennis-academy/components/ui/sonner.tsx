'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

export const Toaster = (props: ToasterProps) => {
  const { theme = 'system' } = useTheme();
  return (
    <Sonner
      {...props}
      theme={theme as ToasterProps['theme']}
      position="top-center"
      toastOptions={{
        className: ['rounded-lg shadow-lg', 'border', 'bg-white dark:bg-gray-800', 'border-gray-200 dark:border-gray-700', 'py-4 px-6'].join(' '),
        style: {
          fontSize: '18px',
          whiteSpace: 'normal', //  줄바꿈 허용
          overflowWrap: 'anywhere', //  단어 중간이라도 줄바꿈
          maxWidth: '360px', //  최대 너비 제한
          lineHeight: '1.5', //  줄간격 확보
        },
        duration: 5000,
      }}
    />
  );
};
