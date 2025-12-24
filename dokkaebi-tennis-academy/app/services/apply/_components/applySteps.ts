'use client';

import type React from 'react';
import { User, ClipboardList, CreditCard, CheckCircle } from 'lucide-react';

export type ApplyStepItem = {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const APPLY_STEPS: ApplyStepItem[] = [
  { id: 1, title: '신청자 정보', icon: User, description: '기본 정보를 입력해주세요' },
  { id: 2, title: '장착 정보', icon: ClipboardList, description: '라켓과 스트링 정보를 선택해주세요' },
  { id: 3, title: '결제 정보', icon: CreditCard, description: '결제 방법을 선택해주세요' },
  { id: 4, title: '추가 요청', icon: CheckCircle, description: '추가 요청사항을 입력해주세요' },
];
