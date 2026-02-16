import { createHash } from 'node:crypto';

export type AdminDangerousActionKey = 'admin.system.cleanup' | 'admin.system.purge';

const ADMIN_RECONFIRM_TEXT: Record<AdminDangerousActionKey, string> = {
  'admin.system.cleanup': '7일 삭제 확인',
  'admin.system.purge': '1년 완전삭제 확인',
};

function normalizeIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map((id) => String(id).trim()).filter(Boolean))).sort();
}

export function createDangerousActionHash(actionKey: AdminDangerousActionKey, candidateIds: string[]): string {
  const canonicalPayload = JSON.stringify({ actionKey, candidateIds: normalizeIds(candidateIds) });
  return createHash('sha256').update(canonicalPayload).digest('hex');
}

export function buildDangerousActionToken(actionKey: AdminDangerousActionKey, adminId: string, previewHash: string): string {
  return Buffer.from(`${actionKey}:${adminId}:${previewHash}`, 'utf8').toString('base64url');
}

export function getDangerousActionReconfirmText(actionKey: AdminDangerousActionKey): string {
  return ADMIN_RECONFIRM_TEXT[actionKey];
}

export function isDangerousActionConfirmationValid(params: {
  actionKey: AdminDangerousActionKey;
  adminId: string;
  previewHash: string;
  confirmationToken?: string;
  confirmationText?: string;
}): boolean {
  const expectedToken = buildDangerousActionToken(params.actionKey, params.adminId, params.previewHash);
  const expectedText = getDangerousActionReconfirmText(params.actionKey);
  const tokenValid = Boolean(params.confirmationToken && params.confirmationToken === expectedToken);
  const textValid = Boolean(params.confirmationText && params.confirmationText.trim() === expectedText);
  return tokenValid || textValid;
}
