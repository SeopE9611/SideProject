"use client";

import type React from "react";
import { User, ClipboardList, CreditCard, CheckCircle } from "lucide-react";

export type ApplyStepItem = {
  id: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const APPLY_STEPS: ApplyStepItem[] = [
  {
    id: 1,
    title: "신청자/수령 정보",
    icon: User,
    description: "연락처와 수령·수거 방식을 입력해주세요",
  },
  {
    id: 2,
    title: "라켓·스트링 정보",
    icon: ClipboardList,
    description: "장착할 라켓과 스트링 정보를 입력해주세요",
  },
  {
    id: 3,
    title: "결제 정보",
    icon: CreditCard,
    description: "패키지와 입금 정보를 확인해주세요",
  },
  {
    id: 4,
    title: "요청사항",
    icon: CheckCircle,
    description: "장착 관련 요청사항을 남겨주세요",
  },
];
