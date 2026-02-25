import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS 4 호환 클래스 병합 유틸리티
 *
 * clsx로 조건부 클래스를 처리하고 tailwind-merge로 충돌을 해결합니다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
