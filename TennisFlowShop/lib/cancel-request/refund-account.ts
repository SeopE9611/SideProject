import { bankLabelMap } from '@/lib/constants';
import { z } from 'zod';

export const REFUND_ACCOUNT_BANKS = ['shinhan', 'kookmin', 'woori'] as const;
export type RefundAccountBank = (typeof REFUND_ACCOUNT_BANKS)[number];

export type RefundAccountInfo = {
  bank: RefundAccountBank;
  account: string;
  holder: string;
};

const toTrimmedString = (value: unknown) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toDigits = (value: unknown) => toTrimmedString(value).replace(/\D/g, '');

/**
 * 환불 계좌 서버 최종 방어 스키마
 * - bank: 허용 은행만
 * - account: 하이픈 제거 후 숫자만 저장
 * - holder: 예금주명 2자 이상
 */
export const RefundAccountSchema = z.object({
  bank: z.enum(REFUND_ACCOUNT_BANKS),
  account: z.preprocess(toDigits, z.string().min(8).max(20)),
  holder: z.preprocess(toTrimmedString, z.string().min(2).max(30)),
});

export function getRefundBankLabel(bank?: string | null) {
  if (!bank) return '은행 미입력';
  return bankLabelMap[String(bank)]?.label ?? String(bank);
}

/**
 * 관리자/사용자 화면 공통 표시용
 * - masked=true 를 주면 계좌번호/예금주를 마스킹해서 보여줄 수 있음
 */
export function formatRefundAccountSummary(refundAccount?: Partial<RefundAccountInfo> | null, options?: { masked?: boolean }) {
  if (!refundAccount) return null;

  const bank = getRefundBankLabel(refundAccount.bank);
  const account = toDigits(refundAccount.account);
  const holder = toTrimmedString(refundAccount.holder);

  if (!bank && !account && !holder) return null;

  if (!options?.masked) {
    return [bank, holder, account].filter(Boolean).join(' / ');
  }

  const maskedAccount = account.length <= 4 ? account : `${account.slice(0, 3)}${'*'.repeat(Math.max(account.length - 7, 2))}${account.slice(-4)}`;

  const maskedHolder = holder.length <= 2 ? `${holder.slice(0, 1)}*` : `${holder.slice(0, 1)}${'*'.repeat(Math.max(holder.length - 2, 1))}${holder.slice(-1)}`;

  return [bank, maskedHolder, maskedAccount].filter(Boolean).join(' / ');
}
