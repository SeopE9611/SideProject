import React, { ReactNode } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

// 성공
export const showSuccessToast = (message: string) =>
  toast.success(message, {
    icon: React.createElement(CheckCircle, {
      className: 'text-success',
      size: 20,
    }),
    className: 'border-success/35 bg-success/10 text-success dark:border-success/45 dark:bg-success/20 dark:text-success',
    duration: 3000,
  });

// 실패
export const showErrorToast = (message: string | ReactNode) =>
  toast.error(message, {
    icon: React.createElement(XCircle, {
      className: 'text-destructive',
      size: 20,
    }),
    className: 'border-destructive/35 bg-destructive/10 text-destructive dark:border-destructive/45 dark:bg-destructive/20 dark:text-destructive',
    duration: 4000,
  });

// 정보
export const showInfoToast = (message: string) =>
  toast(message, {
    icon: React.createElement(AlertTriangle, {
      className: 'text-warning',
      size: 20,
    }),
    className: 'border-warning/35 bg-warning/10 text-warning dark:border-warning/45 dark:bg-warning/20 dark:text-warning',
    duration: 2500,
  });
