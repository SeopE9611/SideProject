'use client';

import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ConfirmSeverity = 'default' | 'danger';

type ConfirmEventType = 'open' | 'cancel' | 'confirm';

interface AdminConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  severity?: ConfirmSeverity;
  confirmText?: string;
  cancelText?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  eventKey?: string;
  eventMeta?: Record<string, unknown>;
}

const logConfirmEvent = (event: ConfirmEventType, eventKey: string, eventMeta?: Record<string, unknown>) => {
  console.info('[admin-confirm-dialog]', {
    event,
    eventKey,
    eventMeta,
    at: new Date().toISOString(),
  });
};

export default function AdminConfirmDialog({
  open,
  title,
  description,
  severity = 'default',
  confirmText = '확인',
  cancelText = '취소',
  onOpenChange,
  onConfirm,
  onCancel,
  eventKey = 'admin-confirm',
  eventMeta,
}: AdminConfirmDialogProps) {
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      logConfirmEvent('open', eventKey, eventMeta);
      onOpenChange(true);
      return;
    }

    if (open) {
      logConfirmEvent('cancel', eventKey, eventMeta);
      onCancel?.();
    }
    onOpenChange(false);
  };

  const handleConfirm = () => {
    logConfirmEvent('confirm', eventKey, eventMeta);
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {severity === 'danger' && <AlertTriangle className="h-4 w-4 text-destructive" />}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction className={severity === 'danger' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined} onClick={handleConfirm}>
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
