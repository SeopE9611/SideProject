import React, { ReactNode } from 'react'; // React.createElement 를 쓰기 위해 필요
import { toast } from 'sonner';
import { CheckCircle, XCircle, Info } from 'lucide-react';

// 성공
export const showSuccessToast = (message: string) =>
  toast.success(message, {
    icon: React.createElement(CheckCircle, {
      className: 'text-emerald-500',
      size: 20,
    }),
    duration: 3000,
  });

// 실패
export const showErrorToast = (message: string | ReactNode) =>
  toast.error(message, {
    icon: React.createElement(XCircle, {
      className: 'text-red-500',
      size: 20,
    }),
    duration: 4000,
    className: 'border border-destructive/30 bg-destructive/10 text-destructive',
  });

// 정보
export const showInfoToast = (message: string) =>
  toast(message, {
    icon: React.createElement(Info, {
      className: 'text-blue-500',
      size: 20,
    }),
    duration: 2500,
  });
