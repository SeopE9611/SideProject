export type Channel = 'email' | 'slack' | 'sms';

export type UserCtx = { name?: string; email: string };
export type ShippingInfo = {
  name?: string;
  phone?: string;
  address?: string;
  addressDetail?: string;
  postalCode?: string;
  depositor?: string;
  deliveryRequest?: string;
};

export type ApplicationCtx = {
  applicationId: string;
  orderId?: string | null;
  status: 'draft' | '검토 중' | '접수완료' | '작업 중' | '교체완료' | '취소';
  stringDetails?: {
    preferredDate?: string; // '2025-10-05'
    preferredTime?: string; // '14:30'
    racket?: string;
    stringTypes?: string[];
    tension?: string;
  };
  shippingInfo?: ShippingInfo;
};

export type EventType =
  | 'stringing.application_submitted'
  | 'stringing.status_updated'
  | 'stringing.schedule_confirmed'
  | 'stringing.schedule_canceled'
  | 'stringing.schedule_updated'
  | 'stringing.application_canceled'
  | 'stringing.service_completed'
  | 'stringing.service_in_progress';

export type OutboxDoc = {
  _id?: any;
  eventType: EventType;
  channels: Channel[];
  payload: any; // 위 컨텍스트(유저/신청/링크 등)
  rendered?: {
    email?: { to: string; subject: string; html: string; ics?: string; bcc?: string }; // [추가]
    slack?: { text: string };
    sms?: { to: string; text: string };
  };
  status: 'queued' | 'sent' | 'failed';
  retries: number;
  dedupeKey?: string;
  createdAt: Date;
  sentAt?: Date;
  error?: string;
};
