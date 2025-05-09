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
        className: 'w-fit bg-red-600 text-white px-6 py-5 mt-12 rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-red-800',
        style: {
          fontSize: '16px',
          fontWeight: 'bold',
          lineHeight: '1.5',
          minWidth: '320px',
          maxWidth: '500px',
        },
        duration: 5000,
      }}
      {...props}
    />
  );
};

export { Toaster };
