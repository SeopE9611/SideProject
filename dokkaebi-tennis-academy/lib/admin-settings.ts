import { z } from 'zod';

export const siteSettingsSchema = z.object({
  siteName: z.string().min(2, { message: '사이트 이름은 2자 이상이어야 합니다.' }),
  siteDescription: z.string().min(10, { message: '사이트 설명은 10자 이상이어야 합니다.' }),
  contactEmail: z.string().email({ message: '유효한 이메일 주소를 입력해주세요.' }),
  contactPhone: z.string().min(8, { message: '유효한 전화번호를 입력해주세요.' }),
  address: z.string().min(5, { message: '주소는 5자 이상이어야 합니다.' }),
  logoUrl: z.string().url({ message: '유효한 URL을 입력해주세요.' }).optional().or(z.literal('')),
  faviconUrl: z.string().url({ message: '유효한 URL을 입력해주세요.' }).optional().or(z.literal('')),
});

export const userSettingsSchema = z.object({
  allowRegistration: z.boolean(),
  requireEmailVerification: z.boolean(),
  defaultUserRole: z.enum(['member', 'coach', 'manager']),
  minimumPasswordLength: z.number().min(8).max(32),
  allowSocialLogin: z.boolean(),
  sessionTimeout: z.number().min(15).max(1440),
});

export const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, { message: 'SMTP 호스트를 입력해주세요.' }),
  smtpPort: z.number().int().min(1).max(65535),
  smtpUsername: z.string().min(1, { message: 'SMTP 사용자 이름을 입력해주세요.' }),
  smtpPassword: z.string().optional().or(z.literal('')),
  smtpEncryption: z.enum(['none', 'ssl', 'tls']),
  senderName: z.string().min(1, { message: '발신자 이름을 입력해주세요.' }),
  senderEmail: z.string().email({ message: '유효한 이메일 주소를 입력해주세요.' }),
});

export const paymentSettingsSchema = z.object({
  currency: z.enum(['KRW', 'USD', 'EUR', 'JPY']),
  taxRate: z.number().min(0).max(100),
  enablePaypal: z.boolean(),
  enableCreditCard: z.boolean(),
  enableBankTransfer: z.boolean(),
  paypalClientId: z.string().optional().or(z.literal('')),
  paypalSecret: z.string().optional().or(z.literal('')),
  stripePublishableKey: z.string().optional().or(z.literal('')),
  stripeSecretKey: z.string().optional().or(z.literal('')),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type UserSettings = z.infer<typeof userSettingsSchema>;
export type EmailSettings = z.infer<typeof emailSettingsSchema>;
export type PaymentSettings = z.infer<typeof paymentSettingsSchema>;

export const defaultSiteSettings: SiteSettings = {
  siteName: '',
  siteDescription: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  logoUrl: '',
  faviconUrl: '',
};

export const defaultUserSettings: UserSettings = {
  allowRegistration: true,
  requireEmailVerification: true,
  defaultUserRole: 'member',
  minimumPasswordLength: 8,
  allowSocialLogin: true,
  sessionTimeout: 120,
};

export const defaultEmailSettings: EmailSettings = {
  smtpHost: '',
  smtpPort: 587,
  smtpUsername: '',
  smtpPassword: '',
  smtpEncryption: 'tls',
  senderName: '',
  senderEmail: '',
};

export const defaultPaymentSettings: PaymentSettings = {
  currency: 'KRW',
  taxRate: 10,
  enablePaypal: false,
  enableCreditCard: true,
  enableBankTransfer: true,
  paypalClientId: '',
  paypalSecret: '',
  stripePublishableKey: '',
  stripeSecretKey: '',
};

export const SETTINGS_COLLECTION = 'settings';
