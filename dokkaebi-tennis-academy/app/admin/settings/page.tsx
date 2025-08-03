'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Save, Send, Globe, User, Mail, CreditCard, Bell, Shield, Share2, Languages, Database } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showSuccessToast } from '@/lib/toast';

// 사이트 설정 스키마
const siteSettingsSchema = z.object({
  siteName: z.string().min(2, { message: '사이트 이름은 2자 이상이어야 합니다.' }),
  siteDescription: z.string().min(10, { message: '사이트 설명은 10자 이상이어야 합니다.' }),
  contactEmail: z.string().email({ message: '유효한 이메일 주소를 입력해주세요.' }),
  contactPhone: z.string().min(10, { message: '유효한 전화번호를 입력해주세요.' }),
  address: z.string().min(5, { message: '주소는 5자 이상이어야 합니다.' }),
  logoUrl: z.string().url({ message: '유효한 URL을 입력해주세요.' }).optional().or(z.literal('')),
  faviconUrl: z.string().url({ message: '유효한 URL을 입력해주세요.' }).optional().or(z.literal('')),
});

// 사용자 설정 스키마
const userSettingsSchema = z.object({
  allowRegistration: z.boolean(),
  requireEmailVerification: z.boolean(),
  defaultUserRole: z.string(),
  minimumPasswordLength: z.number().min(8).max(32),
  allowSocialLogin: z.boolean(),
  sessionTimeout: z.number().min(15).max(1440),
});

// 이메일 설정 스키마
const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1, { message: 'SMTP 호스트를 입력해주세요.' }),
  smtpPort: z.number().min(1).max(65535),
  smtpUsername: z.string().min(1, { message: 'SMTP 사용자 이름을 입력해주세요.' }),
  smtpPassword: z.string().min(1, { message: 'SMTP 비밀번호를 입력해주세요.' }),
  smtpEncryption: z.string(),
  senderName: z.string().min(1, { message: '발신자 이름을 입력해주세요.' }),
  senderEmail: z.string().email({ message: '유효한 이메일 주소를 입력해주세요.' }),
});

// 결제 설정 스키마
const paymentSettingsSchema = z.object({
  currency: z.string(),
  taxRate: z.number().min(0).max(100),
  enablePaypal: z.boolean(),
  enableCreditCard: z.boolean(),
  enableBankTransfer: z.boolean(),
  paypalClientId: z.string().optional().or(z.literal('')),
  paypalSecret: z.string().optional().or(z.literal('')),
  stripePublishableKey: z.string().optional().or(z.literal('')),
  stripeSecretKey: z.string().optional().or(z.literal('')),
});

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('site');

  // 사이트 설정 폼
  const siteForm = useForm<z.infer<typeof siteSettingsSchema>>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: {
      siteName: '도깨비 테니스 아카데미',
      siteDescription: '최고의 테니스 교육과 시설을 제공하는 프리미엄 테니스 아카데미',
      contactEmail: 'contact@dokkaebi-tennis.com',
      contactPhone: '02-123-4567',
      address: '서울특별시 강남구 테니스로 123',
      logoUrl: 'https://example.com/logo.png',
      faviconUrl: 'https://example.com/favicon.ico',
    },
  });

  // 사용자 설정 폼
  const userForm = useForm<z.infer<typeof userSettingsSchema>>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      allowRegistration: true,
      requireEmailVerification: true,
      defaultUserRole: 'member',
      minimumPasswordLength: 8,
      allowSocialLogin: true,
      sessionTimeout: 120,
    },
  });

  // 이메일 설정 폼
  const emailForm = useForm<z.infer<typeof emailSettingsSchema>>({
    resolver: zodResolver(emailSettingsSchema),
    defaultValues: {
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUsername: 'noreply@dokkaebi-tennis.com',
      smtpPassword: 'password',
      smtpEncryption: 'tls',
      senderName: '도깨비 테니스 아카데미',
      senderEmail: 'noreply@dokkaebi-tennis.com',
    },
  });

  // 결제 설정 폼
  const paymentForm = useForm<z.infer<typeof paymentSettingsSchema>>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      currency: 'KRW',
      taxRate: 10,
      enablePaypal: true,
      enableCreditCard: true,
      enableBankTransfer: true,
      paypalClientId: '',
      paypalSecret: '',
      stripePublishableKey: '',
      stripeSecretKey: '',
    },
  });

  // 폼 제출 핸들러
  const onSubmitSiteSettings = (data: z.infer<typeof siteSettingsSchema>) => {
    console.log('사이트 설정 저장:', data);
    showSuccessToast('사이트 설정이 저장되었습니다.');
  };

  const onSubmitUserSettings = (data: z.infer<typeof userSettingsSchema>) => {
    console.log('사용자 설정 저장:', data);
    showSuccessToast('사용자 설정이 저장되었습니다.');
  };

  const onSubmitEmailSettings = (data: z.infer<typeof emailSettingsSchema>) => {
    console.log('이메일 설정 저장:', data);
    showSuccessToast('이메일 설정이 저장되었습니다.');
  };

  const onSubmitPaymentSettings = (data: z.infer<typeof paymentSettingsSchema>) => {
    console.log('결제 설정 저장:', data);
    showSuccessToast('결제 설정이 저장되었습니다.');
  };

  // 테스트 이메일 발송
  const sendTestEmail = () => {
    showSuccessToast('테스트 이메일이 발송되었습니다.');
  };

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-5xl">
        {/* 페이지 제목 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">설정</h1>
          <p className="mt-2 text-muted-foreground">도깨비 테니스 아카데미 웹사이트의 설정을 관리합니다.</p>
        </div>

        {/* 설정 탭 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9">
            <TabsTrigger value="site" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden md:inline">사이트</span>
            </TabsTrigger>
            <TabsTrigger value="user" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">사용자</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden md:inline">이메일</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden md:inline">결제</span>
            </TabsTrigger>
            <TabsTrigger value="notification" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden md:inline">알림</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden md:inline">보안</span>
            </TabsTrigger>
            <TabsTrigger value="integration" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              <span className="hidden md:inline">통합</span>
            </TabsTrigger>
            <TabsTrigger value="localization" className="flex items-center gap-2">
              <Languages className="h-4 w-4" />
              <span className="hidden md:inline">지역화</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden md:inline">백업</span>
            </TabsTrigger>
          </TabsList>

          {/* 사이트 설정 */}
          <TabsContent value="site">
            <Card>
              <CardHeader>
                <CardTitle>사이트 설정</CardTitle>
                <CardDescription>웹사이트의 기본 정보와 외관을 설정합니다.</CardDescription>
              </CardHeader>
              <form onSubmit={siteForm.handleSubmit(onSubmitSiteSettings)}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">사이트 이름</Label>
                      <Input id="siteName" {...siteForm.register('siteName')} />
                      {siteForm.formState.errors.siteName && <p className="text-sm text-red-500">{siteForm.formState.errors.siteName.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactEmail">연락처 이메일</Label>
                      <Input id="contactEmail" type="email" {...siteForm.register('contactEmail')} />
                      {siteForm.formState.errors.contactEmail && <p className="text-sm text-red-500">{siteForm.formState.errors.contactEmail.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siteDescription">사이트 설명</Label>
                    <Textarea id="siteDescription" {...siteForm.register('siteDescription')} />
                    {siteForm.formState.errors.siteDescription && <p className="text-sm text-red-500">{siteForm.formState.errors.siteDescription.message}</p>}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">연락처 전화번호</Label>
                      <Input id="contactPhone" {...siteForm.register('contactPhone')} />
                      {siteForm.formState.errors.contactPhone && <p className="text-sm text-red-500">{siteForm.formState.errors.contactPhone.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">주소</Label>
                      <Input id="address" {...siteForm.register('address')} />
                      {siteForm.formState.errors.address && <p className="text-sm text-red-500">{siteForm.formState.errors.address.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="logoUrl">로고 URL</Label>
                      <Input id="logoUrl" {...siteForm.register('logoUrl')} />
                      {siteForm.formState.errors.logoUrl && <p className="text-sm text-red-500">{siteForm.formState.errors.logoUrl.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="faviconUrl">파비콘 URL</Label>
                      <Input id="faviconUrl" {...siteForm.register('faviconUrl')} />
                      {siteForm.formState.errors.faviconUrl && <p className="text-sm text-red-500">{siteForm.formState.errors.faviconUrl.message}</p>}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="ml-auto">
                    <Save className="mr-2 h-4 w-4" />
                    설정 저장
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* 사용자 설정 */}
          <TabsContent value="user">
            <Card>
              <CardHeader>
                <CardTitle>사용자 설정</CardTitle>
                <CardDescription>사용자 계정 및 인증 관련 설정을 관리합니다.</CardDescription>
              </CardHeader>
              <form onSubmit={userForm.handleSubmit(onSubmitUserSettings)}>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allowRegistration">회원가입 허용</Label>
                      <p className="text-sm text-muted-foreground">새로운 사용자의 회원가입을 허용합니다.</p>
                    </div>
                    <Switch id="allowRegistration" checked={userForm.watch('allowRegistration')} onCheckedChange={(checked) => userForm.setValue('allowRegistration', checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="requireEmailVerification">이메일 인증 필수</Label>
                      <p className="text-sm text-muted-foreground">회원가입 시 이메일 인증을 필수로 요구합니다.</p>
                    </div>
                    <Switch id="requireEmailVerification" checked={userForm.watch('requireEmailVerification')} onCheckedChange={(checked) => userForm.setValue('requireEmailVerification', checked)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultUserRole">기본 사용자 역할</Label>
                    <Select value={userForm.watch('defaultUserRole')} onValueChange={(value) => userForm.setValue('defaultUserRole', value)}>
                      <SelectTrigger id="defaultUserRole">
                        <SelectValue placeholder="역할 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">일반 회원</SelectItem>
                        <SelectItem value="premium">프리미엄 회원</SelectItem>
                        <SelectItem value="instructor">강사</SelectItem>
                        <SelectItem value="admin">관리자</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minimumPasswordLength">최소 비밀번호 길이</Label>
                    <Input id="minimumPasswordLength" type="number" min="8" max="32" {...userForm.register('minimumPasswordLength', { valueAsNumber: true })} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allowSocialLogin">소셜 로그인 허용</Label>
                      <p className="text-sm text-muted-foreground">소셜 미디어를 통한 로그인을 허용합니다.</p>
                    </div>
                    <Switch id="allowSocialLogin" checked={userForm.watch('allowSocialLogin')} onCheckedChange={(checked) => userForm.setValue('allowSocialLogin', checked)} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">세션 타임아웃 (분)</Label>
                    <Input id="sessionTimeout" type="number" min="15" max="1440" {...userForm.register('sessionTimeout', { valueAsNumber: true })} />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="ml-auto">
                    <Save className="mr-2 h-4 w-4" />
                    설정 저장
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* 이메일 설정 */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>이메일 설정</CardTitle>
                <CardDescription>이메일 발송을 위한 SMTP 설정을 관리합니다.</CardDescription>
              </CardHeader>
              <form onSubmit={emailForm.handleSubmit(onSubmitEmailSettings)}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="smtpHost">SMTP 호스트</Label>
                      <Input id="smtpHost" {...emailForm.register('smtpHost')} />
                      {emailForm.formState.errors.smtpHost && <p className="text-sm text-red-500">{emailForm.formState.errors.smtpHost.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPort">SMTP 포트</Label>
                      <Input id="smtpPort" type="number" {...emailForm.register('smtpPort', { valueAsNumber: true })} />
                      {emailForm.formState.errors.smtpPort && <p className="text-sm text-red-500">{emailForm.formState.errors.smtpPort.message}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="smtpUsername">SMTP 사용자 이름</Label>
                      <Input id="smtpUsername" {...emailForm.register('smtpUsername')} />
                      {emailForm.formState.errors.smtpUsername && <p className="text-sm text-red-500">{emailForm.formState.errors.smtpUsername.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtpPassword">SMTP 비밀번호</Label>
                      <Input id="smtpPassword" type="password" {...emailForm.register('smtpPassword')} />
                      {emailForm.formState.errors.smtpPassword && <p className="text-sm text-red-500">{emailForm.formState.errors.smtpPassword.message}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtpEncryption">SMTP 암호화</Label>
                    <Select value={emailForm.watch('smtpEncryption')} onValueChange={(value) => emailForm.setValue('smtpEncryption', value)}>
                      <SelectTrigger id="smtpEncryption">
                        <SelectValue placeholder="암호화 방식 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">없음</SelectItem>
                        <SelectItem value="ssl">SSL</SelectItem>
                        <SelectItem value="tls">TLS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="senderName">발신자 이름</Label>
                      <Input id="senderName" {...emailForm.register('senderName')} />
                      {emailForm.formState.errors.senderName && <p className="text-sm text-red-500">{emailForm.formState.errors.senderName.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senderEmail">발신자 이메일</Label>
                      <Input id="senderEmail" type="email" {...emailForm.register('senderEmail')} />
                      {emailForm.formState.errors.senderEmail && <p className="text-sm text-red-500">{emailForm.formState.errors.senderEmail.message}</p>}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={sendTestEmail}>
                    <Send className="mr-2 h-4 w-4" />
                    테스트 이메일 발송
                  </Button>
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    설정 저장
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* 결제 설정 */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle>결제 설정</CardTitle>
                <CardDescription>결제 방식 및 통화, 세금 설정을 관리합니다.</CardDescription>
              </CardHeader>
              <form onSubmit={paymentForm.handleSubmit(onSubmitPaymentSettings)}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="currency">통화</Label>
                      <Select value={paymentForm.watch('currency')} onValueChange={(value) => paymentForm.setValue('currency', value)}>
                        <SelectTrigger id="currency">
                          <SelectValue placeholder="통화 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KRW">한국 원화 (₩)</SelectItem>
                          <SelectItem value="USD">미국 달러 ($)</SelectItem>
                          <SelectItem value="EUR">유로 (€)</SelectItem>
                          <SelectItem value="JPY">일본 엔 (¥)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxRate">세금율 (%)</Label>
                      <Input id="taxRate" type="number" min="0" max="100" step="0.1" {...paymentForm.register('taxRate', { valueAsNumber: true })} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">결제 방식</h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enablePaypal">PayPal</Label>
                        <p className="text-sm text-muted-foreground">PayPal을 통한 결제를 허용합니다.</p>
                      </div>
                      <Switch id="enablePaypal" checked={paymentForm.watch('enablePaypal')} onCheckedChange={(checked) => paymentForm.setValue('enablePaypal', checked)} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableCreditCard">신용카드</Label>
                        <p className="text-sm text-muted-foreground">신용카드를 통한 결제를 허용합니다.</p>
                      </div>
                      <Switch id="enableCreditCard" checked={paymentForm.watch('enableCreditCard')} onCheckedChange={(checked) => paymentForm.setValue('enableCreditCard', checked)} />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableBankTransfer">계좌이체</Label>
                        <p className="text-sm text-muted-foreground">계좌이체를 통한 결제를 허용합니다.</p>
                      </div>
                      <Switch id="enableBankTransfer" checked={paymentForm.watch('enableBankTransfer')} onCheckedChange={(checked) => paymentForm.setValue('enableBankTransfer', checked)} />
                    </div>
                  </div>

                  {paymentForm.watch('enablePaypal') && (
                    <div className="space-y-4 rounded-md border p-4">
                      <h4 className="font-medium">PayPal 설정</h4>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="paypalClientId">PayPal 클라이언트 ID</Label>
                          <Input id="paypalClientId" {...paymentForm.register('paypalClientId')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paypalSecret">PayPal 시크릿</Label>
                          <Input id="paypalSecret" type="password" {...paymentForm.register('paypalSecret')} />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentForm.watch('enableCreditCard') && (
                    <div className="space-y-4 rounded-md border p-4">
                      <h4 className="font-medium">Stripe 설정</h4>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="stripePublishableKey">Stripe 공개 키</Label>
                          <Input id="stripePublishableKey" {...paymentForm.register('stripePublishableKey')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="stripeSecretKey">Stripe 시크릿 키</Label>
                          <Input id="stripeSecretKey" type="password" {...paymentForm.register('stripeSecretKey')} />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="ml-auto">
                    <Save className="mr-2 h-4 w-4" />
                    설정 저장
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* 알림 설정 */}
          <TabsContent value="notification">
            <Card>
              <CardHeader>
                <CardTitle>알림 설정</CardTitle>
                <CardDescription>이메일 및 SMS 알림 설정을 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">이메일 알림</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>회원가입 알림</Label>
                        <p className="text-sm text-muted-foreground">새로운 회원 가입 시 관리자에게 알림</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>주문 알림</Label>
                        <p className="text-sm text-muted-foreground">새로운 주문 발생 시 관리자에게 알림</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>문의 알림</Label>
                        <p className="text-sm text-muted-foreground">새로운 문의 등록 시 관리자에게 알림</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">SMS 알림</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SMS 알림 활성화</Label>
                        <p className="text-sm text-muted-foreground">SMS를 통한 알림 발송 활성화</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smsProvider">SMS 제공업체</Label>
                    <Select defaultValue="none">
                      <SelectTrigger id="smsProvider">
                        <SelectValue placeholder="제공업체 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">선택 안함</SelectItem>
                        <SelectItem value="twilio">Twilio</SelectItem>
                        <SelectItem value="nhn">NHN Cloud</SelectItem>
                        <SelectItem value="naver">네이버 클라우드</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="ml-auto">
                  <Save className="mr-2 h-4 w-4" />
                  설정 저장
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* 보안 설정 */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>보안 설정</CardTitle>
                <CardDescription>웹사이트의 보안 관련 설정을 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">로그인 보안</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>2단계 인증</Label>
                        <p className="text-sm text-muted-foreground">사용자에게 2단계 인증 옵션 제공</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>로그인 시도 제한</Label>
                        <p className="text-sm text-muted-foreground">로그인 실패 시 계정 잠금 활성화</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">최대 로그인 시도 횟수</Label>
                    <Input id="maxLoginAttempts" type="number" defaultValue="5" min="1" max="10" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">데이터 보안</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>HTTPS 강제 적용</Label>
                        <p className="text-sm text-muted-foreground">모든 연결에 HTTPS 사용 강제</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>CSRF 보호</Label>
                        <p className="text-sm text-muted-foreground">크로스 사이트 요청 위조 방지</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="ml-auto">
                  <Save className="mr-2 h-4 w-4" />
                  설정 저장
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* 통합 설정 */}
          <TabsContent value="integration">
            <Card>
              <CardHeader>
                <CardTitle>통합 설정</CardTitle>
                <CardDescription>외부 서비스 및 API 통합 설정을 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">소셜 미디어</h3>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="facebookUrl">Facebook URL</Label>
                      <Input id="facebookUrl" placeholder="https://facebook.com/..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagramUrl">Instagram URL</Label>
                      <Input id="instagramUrl" placeholder="https://instagram.com/..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="youtubeUrl">YouTube URL</Label>
                      <Input id="youtubeUrl" placeholder="https://youtube.com/..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="naverBlogUrl">네이버 블로그 URL</Label>
                      <Input id="naverBlogUrl" placeholder="https://blog.naver.com/..." />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">분석 도구</h3>
                  <div className="space-y-2">
                    <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
                    <Input id="googleAnalyticsId" placeholder="G-XXXXXXXXXX" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="naverAnalyticsId">네이버 애널리틱스 ID</Label>
                    <Input id="naverAnalyticsId" placeholder="XXXXXXXXXX" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">지도 API</h3>
                  <div className="space-y-2">
                    <Label htmlFor="kakaoMapApiKey">카카오맵 API 키</Label>
                    <Input id="kakaoMapApiKey" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="naverMapApiKey">네이버맵 API 키</Label>
                    <Input id="naverMapApiKey" type="password" />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="ml-auto">
                  <Save className="mr-2 h-4 w-4" />
                  설정 저장
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* 지역화 설정 */}
          <TabsContent value="localization">
            <Card>
              <CardHeader>
                <CardTitle>지역화 설정</CardTitle>
                <CardDescription>언어, 시간대, 날짜 형식 등의 지역화 설정을 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultLanguage">기본 언어</Label>
                  <Select defaultValue="ko">
                    <SelectTrigger id="defaultLanguage">
                      <SelectValue placeholder="언어 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ko">한국어</SelectItem>
                      <SelectItem value="en">영어</SelectItem>
                      <SelectItem value="ja">일본어</SelectItem>
                      <SelectItem value="zh">중국어</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone">시간대</Label>
                  <Select defaultValue="Asia/Seoul">
                    <SelectTrigger id="timezone">
                      <SelectValue placeholder="시간대 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Seoul">서울 (GMT+9)</SelectItem>
                      <SelectItem value="America/New_York">뉴욕 (GMT-5)</SelectItem>
                      <SelectItem value="Europe/London">런던 (GMT+0)</SelectItem>
                      <SelectItem value="Asia/Tokyo">도쿄 (GMT+9)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">날짜 형식</Label>
                  <Select defaultValue="YYYY-MM-DD">
                    <SelectTrigger id="dateFormat">
                      <SelectValue placeholder="날짜 형식 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY년 MM월 DD일">YYYY년 MM월 DD일</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeFormat">시간 형식</Label>
                  <Select defaultValue="24">
                    <SelectTrigger id="timeFormat">
                      <SelectValue placeholder="시간 형식 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12시간 (AM/PM)</SelectItem>
                      <SelectItem value="24">24시간</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>다국어 지원</Label>
                      <p className="text-sm text-muted-foreground">다국어 지원 활성화</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="ml-auto">
                  <Save className="mr-2 h-4 w-4" />
                  설정 저장
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* 백업 설정 */}
          <TabsContent value="backup">
            <Card>
              <CardHeader>
                <CardTitle>백업 및 유지보수</CardTitle>
                <CardDescription>데이터 백업 및 시스템 유지보수 설정을 관리합니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">자동 백업</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>자동 백업 활성화</Label>
                        <p className="text-sm text-muted-foreground">정기적인 데이터 자동 백업</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backupFrequency">백업 주기</Label>
                    <Select defaultValue="daily">
                      <SelectTrigger id="backupFrequency">
                        <SelectValue placeholder="백업 주기 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">매시간</SelectItem>
                        <SelectItem value="daily">매일</SelectItem>
                        <SelectItem value="weekly">매주</SelectItem>
                        <SelectItem value="monthly">매월</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backupRetention">백업 보관 기간 (일)</Label>
                    <Input id="backupRetention" type="number" defaultValue="30" min="1" max="365" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="backupStorage">백업 저장소</Label>
                    <Select defaultValue="local">
                      <SelectTrigger id="backupStorage">
                        <SelectValue placeholder="저장소 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">로컬 서버</SelectItem>
                        <SelectItem value="s3">Amazon S3</SelectItem>
                        <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                        <SelectItem value="azure">Azure Blob Storage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">유지보수 모드</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>유지보수 모드 활성화</Label>
                        <p className="text-sm text-muted-foreground">사이트를 유지보수 모드로 전환</p>
                      </div>
                      <Switch />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maintenanceMessage">유지보수 메시지</Label>
                    <Textarea id="maintenanceMessage" placeholder="현재 사이트가 유지보수 중입니다. 잠시 후 다시 시도해주세요." rows={3} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">데이터베이스 최적화</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>자동 최적화 활성화</Label>
                        <p className="text-sm text-muted-foreground">정기적인 데이터베이스 최적화</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="optimizationFrequency">최적화 주기</Label>
                    <Select defaultValue="weekly">
                      <SelectTrigger id="optimizationFrequency">
                        <SelectValue placeholder="최적화 주기 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">매일</SelectItem>
                        <SelectItem value="weekly">매주</SelectItem>
                        <SelectItem value="monthly">매월</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">지금 백업하기</Button>
                <Button>
                  <Save className="mr-2 h-4 w-4" />
                  설정 저장
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
