export type MessageListItem = {
  id: string;

  fromUserId: string | null;
  fromName: string;

  toUserId: string | null;
  toName: string;

  title: string;
  snippet: string;

  isRead: boolean;
  createdAt: string;

  // 관리자 공지/전체발송용
  isAdmin?: boolean;
  isBroadcast?: boolean;
  broadcastId?: string;

  // TTL 만료(전체발송 자동삭제)
  expiresAt?: string;
};

export type MessageDetail = {
  id: string;

  fromUserId: string | null;
  fromName: string;

  toUserId: string | null;
  toName: string;

  title: string;
  body: string;

  createdAt: string;
  readAt: string | null;

  isAdmin?: boolean;
  isBroadcast?: boolean;
  broadcastId?: string;
  expiresAt?: string;
};
