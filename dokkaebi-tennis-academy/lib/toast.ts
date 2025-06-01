import { ReactNode } from 'react';
import { toast } from 'sonner';

// 성공 토스트 전역 함수
export const showSuccessToast = (message: string) =>
  toast.success(message, {
    icon: '✅',
    duration: 3000,
  });

// 실패 토스트 전역 함수
export const showErrorToast = (message: ReactNode) =>
  toast.error(message, {
    icon: '🚫',
    style: {
      background: '#fef2f2', // 연한 빨강
      color: '#b91c1c',
      border: '1px solid #fca5a5',
    },
    duration: 4000,
  });

// 일반 알림
export const showToast = (message: string) =>
  toast(message, {
    icon: 'ℹ️',
  });
