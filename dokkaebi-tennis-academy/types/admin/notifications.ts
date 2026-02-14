export type AdminOutboxStatus = 'queued' | 'failed' | 'sent';
export type AdminOutboxChannel = 'email' | 'slack' | 'sms';

export interface AdminOutboxListRequestDto {
  page: number;
  limit: number;
  status: 'all' | AdminOutboxStatus;
  q: string;
}

export interface AdminOutboxListItemDto {
  id: string;
  eventType: string;
  status: AdminOutboxStatus;
  channels: AdminOutboxChannel[];
  to: string | null;
  subject: string | null;
  retries: number;
  createdAt: string;
  sentAt: string | null;
  error: string | null;
  applicationId: string | null;
  orderId: string | null;
}

export interface AdminOutboxListResponseDto {
  items: AdminOutboxListItemDto[];
  total: number;
}

export interface AdminOutboxDetailChannelDto {
  channel?: string;
  to?: string;
  rendered?: {
    subject?: string;
    text?: string;
    html?: string;
  };
}

export interface AdminOutboxDetailResponseDto {
  id: string;
  status?: string;
  eventType?: string;
  channels?: AdminOutboxDetailChannelDto[];
  channel?: string;
  to?: string;
  subject?: string;
  rendered?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  error?: unknown;
  retries?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  sentAt?: string | null;
  lastTriedAt?: string | null;
  [key: string]: unknown;
}
