// lib/toast.ts
import React from 'react'; // React.createElement 를 쓰기 위해 필요
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
export const showErrorToast = (message: string) =>
  toast.error(message, {
    icon: React.createElement(XCircle, {
      className: 'text-red-500',
      size: 20,
    }),
    duration: 4000,
    style: {
      background: '#fef2f2',
      color: '#b91c1c',
      border: '1px solid #fca5a5',
    },
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
