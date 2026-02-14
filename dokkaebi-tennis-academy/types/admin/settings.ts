import type { EmailSettings as EmailSettingsModel, PaymentSettings as PaymentSettingsModel, SiteSettings as SiteSettingsModel, UserSettings as UserSettingsModel } from '@/lib/admin-settings';

export type SiteSettings = SiteSettingsModel;
export type UserSettings = UserSettingsModel;
export type EmailSettings = EmailSettingsModel;
export type PaymentSettings = PaymentSettingsModel;

export type SettingsTab = 'site' | 'user' | 'email' | 'payment';
export type AuthErrorType = 'unauthorized' | 'forbidden' | null;
export type TabErrorState = { type: AuthErrorType; message: string };

export type SettingsApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
  message?: string;
};

export type SiteSettingsResponse = SettingsApiResponse<SiteSettings>;
export type UserSettingsResponse = SettingsApiResponse<UserSettings>;
export type EmailSettingsResponse = SettingsApiResponse<EmailSettings>;
export type PaymentSettingsResponse = SettingsApiResponse<PaymentSettings>;
