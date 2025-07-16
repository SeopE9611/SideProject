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
          fontSize: '16px',
          fontWeight: 'bold',
          lineHeight: '1.5',
          maxWidth: '320px',
        },
        duration: 5000,
      }}
    />
  );
};
