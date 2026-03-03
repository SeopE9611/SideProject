import { ObjectId } from 'mongodb';

const MEMBER_FALLBACK = '회원';

type NameSource = string | null | undefined;

type CommunityDisplayNameInput = {
  userName?: NameSource;
  userNickname?: NameSource;
  authorName?: NameSource;
  nickname?: NameSource;
  authorEmail?: NameSource;
};

function normalizeName(value: NameSource): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getEmailLocalPart(email: NameSource): string | null {
  const normalized = normalizeName(email);
  if (!normalized) return null;
  const localPart = normalized.split('@')[0]?.trim();
  return localPart || null;
}

export function resolveCommunityDisplayName(input: CommunityDisplayNameInput): string {
  return (
    normalizeName(input.userName) ??
    normalizeName(input.userNickname) ??
    normalizeName(input.authorName) ??
    normalizeName(input.nickname) ??
    getEmailLocalPart(input.authorEmail) ??
    MEMBER_FALLBACK
  );
}

export function getValidCommunityUserObjectIds(userIds: Array<string | ObjectId | null | undefined>): ObjectId[] {
  return Array.from(
    new Set(
      userIds
        .map((userId) => {
          const value = userId instanceof ObjectId ? userId.toHexString() : typeof userId === 'string' ? userId : '';
          return ObjectId.isValid(value) ? value : null;
        })
        .filter((value): value is string => Boolean(value)),
    ),
  ).map((value) => new ObjectId(value));
}
