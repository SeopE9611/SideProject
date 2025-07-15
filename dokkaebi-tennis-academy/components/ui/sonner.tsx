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
        className: ['bg-red-600/10', 'border border-red-600', 'rounded-lg', 'shadow-lg', 'py-4 px-6'].join(' '),
        style: {
          fontSize: '16px',
          fontWeight: 'bold',
          lineHeight: '1.5',
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
          wordBreak: 'keep-all',
          maxWidth: '320px',
        },
        duration: 5000,
      }}
      {...props}
    />
  );
};

export { Toaster };
