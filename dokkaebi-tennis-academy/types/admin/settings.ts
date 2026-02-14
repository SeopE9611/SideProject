import type { EmailSettings, PaymentSettings, SiteSettings, UserSettings } from '@/lib/admin-settings';

export type SettingsTab = 'site' | 'user' | 'email' | 'payment';

export type SettingsApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
};

export type SiteSettingsResponse = SettingsApiResponse<SiteSettings>;
export type UserSettingsResponse = SettingsApiResponse<UserSettings>;
export type EmailSettingsResponse = SettingsApiResponse<EmailSettings>;
export type PaymentSettingsResponse = SettingsApiResponse<PaymentSettings>;
