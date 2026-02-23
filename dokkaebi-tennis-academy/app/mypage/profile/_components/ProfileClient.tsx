'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, Save, User, Mail, Phone, MapPin, Shield, Bell, Settings, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { showErrorToast, showInfoToast, showSuccessToast } from '@/lib/toast';
import WithdrawalReasonSelect from '@/app/mypage/profile/_components/WithdrawalReasonSelect';
import { useRouter } from 'next/navigation';
import { MdSportsTennis } from 'react-icons/md';
import TennisProfileForm from '@/app/mypage/profile/_components/TennisProfileForm';
import { Badge } from '@/components/ui/badge';
import { useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

// 제출 직전 최종 유효성 가드
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_RE = /^\d{5}$/;
const onlyDigits = (v: string) => String(v ?? '').replace(/\D/g, '');
const isValidKoreanPhone = (v: string) => {
 const d = onlyDigits(v);
 return d.length === 10 || d.length === 11; // 01012345678 / 0212345678 등
};
// "8자 이상 + 영문/숫자 조합" (특수문자는 허용)
const PW_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// ProfileClient에서 “이탈 경고 기준”으로 삼을 필드만 뽑아 시그니처 문자열로 만듦(비교용)
const profileDirtySignature = (d: { name?: string; email?: string; phone?: string; address?: { postalCode?: string; address1?: string; address2?: string }; marketing?: { email?: boolean; sms?: boolean; push?: boolean } }) =>
 JSON.stringify({
 name: String(d.name ?? '').trim(),
 email: String(d.email ?? '').trim(),
 phone: String(d.phone ?? '').trim(),
 address: {
 postalCode: String(d.address?.postalCode ?? '').trim(),
 address1: String(d.address?.address1 ?? '').trim(),
 address2: String(d.address?.address2 ?? '').trim(),
 },
 marketing: { email: !!d.marketing?.email, sms: !!d.marketing?.sms, push: !!d.marketing?.push },
 });

type Props = {
 user: {
 id: string;
 name: string;
 email: string;
 role: string;
 };
};

export default function ProfileClient({ user }: Props) {
 const router = useRouter();

 // 서버에서 불러온 “초기값(baseline)” 시그니처 (로드 완료 후 1회 세팅)
 const [initialProfileSig, setInitialProfileSig] = useState('');

 const [profileData, setProfileData] = useState({
 name: '',
 email: '',
 phone: '',
 birthDate: '',
 gender: '',
 address: {
 postalCode: '',
 address1: '',
 address2: '',
 },
 marketing: {
 email: false,
 sms: false,
 push: false,
 },
 });

 // 소셜 로그인 제공자(표시용): /api/users/me에서 내려주는 oauthProviders
 const [socialProviders, setSocialProviders] = useState<Array<'kakao' | 'naver'>>([]);

 const [passwordData, setPasswordData] = useState({
 currentPassword: '',
 newPassword: '',
 confirmPassword: '',
 });

 const [isLoading, setIsLoading] = useState(false);
 const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);

 // 현재 입력 상태 시그니처(편집 가능한 핵심 필드만 비교)
 const currentProfileSig = useMemo(() => profileDirtySignature(profileData), [profileData]);
 const isProfileDirty = Boolean(initialProfileSig) && currentProfileSig !== initialProfileSig;

 // 비밀번호 탭: 입력 중이면 dirty (서버 baseline 필요 없음)
 const isPasswordDirty = Boolean(passwordData.currentPassword || passwordData.newPassword || passwordData.confirmPassword);

 // 최종 dirty (프로필/주소/마케팅 변경 OR 비밀번호 입력 중)
 useUnsavedChangesGuard(isProfileDirty || isPasswordDirty);

 useEffect(() => {
 const fetchProfile = async () => {
 try {
 const res = await fetch('/api/users/me', {
 method: 'GET',
 headers: {
 'Content-Type': 'application/json',
 },
 credentials: 'include',
 });
 if (!res.ok) throw new Error('정보를 불러올 수 없습니다');

 const user = await res.json();
 setSocialProviders(Array.isArray((user as any).oauthProviders) ? (user as any).oauthProviders : []);

 const { address, postalCode, addressDetail, ...rest } = user;

 // 최신 state 기반으로 안전하게 병합(closure stale 방지)
 setProfileData((prev) => {
 const next = {
 ...prev,
 ...rest,
 address: {
 address1: address ?? '',
 postalCode: postalCode ?? '',
 address2: addressDetail ?? '',
 },
 };
 // baseline은 “서버 로드 성공 시점”의 값으로 1회만 세팅
 setInitialProfileSig((sig) => sig || profileDirtySignature(next));
 return next;
 });
 } catch (err) {
 console.error(err);
 showErrorToast('회원 정보를 불러오는 중 오류가 발생했습니다.');
 }
 };

 fetchProfile();
 }, []);

 // 우편 번호 검색
 const handleAddressSearch = () => {
 new window.daum.Postcode({
 oncomplete: (data: any) => {
 const fullAddress = data.address;
 const postalCode = data.zonecode;

 setProfileData((prev) => ({
 ...prev,
 address: {
 ...prev.address,
 address1: fullAddress,
 postalCode: postalCode,
 },
 }));
 },
 }).open();
 };

 const handleSave = async () => {
 // 저장 전 최종 유효성 검사
 const nameTrim = String(profileData.name ?? '').trim();
 const emailTrim = String(profileData.email ?? '').trim();
 const phoneDigits = onlyDigits(profileData.phone ?? '');

 // 필수값(화면에도 *로 표시되어 있음)
 if (!nameTrim || nameTrim.length < 2) {
 showErrorToast('이름을 확인해주세요. (2자 이상)');
 return;
 }
 if (!emailTrim || !EMAIL_RE.test(emailTrim)) {
 showErrorToast('이메일 형식을 확인해주세요.');
 return;
 }

 // 전화번호는 UI상 필수 표시는 아니지만, 입력했다면 형식은 맞아야 함
 if (phoneDigits && !isValidKoreanPhone(phoneDigits)) {
 showErrorToast('전화번호는 숫자 10~11자리로 입력해주세요.');
 return;
 }

 // 주소를 저장하려는 경우(주소/우편번호 중 하나라도 있으면) 우편번호 5자리 검증
 const basicAddress = String(profileData.address?.address1 ?? '').trim();
 const detailedAddress = String(profileData.address?.address2 ?? '').trim();
 const postalCode = String(profileData.address?.postalCode ?? '').trim();
 const hasAnyAddress = Boolean(basicAddress || detailedAddress || postalCode);
 if (hasAnyAddress && (!postalCode || !POSTAL_RE.test(postalCode))) {
 showErrorToast('우편번호(5자리)를 확인해주세요.');
 return;
 }

 setIsLoading(true);
 try {
 const basicAddress = profileData.address.address1.trim();
 const detailedAddress = profileData.address.address2.trim();
 const postalCode = profileData.address.postalCode;

 const res = await fetch('/api/users/me', {
 method: 'PATCH',
 headers: {
 'Content-Type': 'application/json',
 },
 credentials: 'include',
 body: JSON.stringify({
 name: nameTrim,
 email: emailTrim,
 phone: phoneDigits, // 서버에는 정규화된 전화번호(숫자만)를 저장
 postalCode,
 address: basicAddress,
 addressDetail: detailedAddress,
 marketing: profileData.marketing,
 }),
 });

 if (!res.ok) throw new Error('저장 실패');

 showSuccessToast('회원 정보가 성공적으로 저장되었습니다.');
 // 저장 성공 → 현재 상태를 baseline으로 갱신(이탈 경고 해제)
 setInitialProfileSig(profileDirtySignature(profileData));
 } catch (err) {
 console.error(err);
 showErrorToast('오류가 발생했습니다. 다시 시도해주세요.');
 } finally {
 setIsLoading(false);
 }
 };

 const handlePasswordChange = async () => {
 // 비밀번호 변경 유효성 검사
 const cur = passwordData.currentPassword;
 const next = passwordData.newPassword;
 const confirm = passwordData.confirmPassword;

 if (!cur) {
 showErrorToast('현재 비밀번호를 입력해주세요.');
 return;
 }
 if (!next) {
 showErrorToast('새 비밀번호를 입력해주세요.');
 return;
 }
 if (!PW_RE.test(next)) {
 showErrorToast('새 비밀번호는 8자 이상이며 영문/숫자 조합이어야 합니다.');
 return;
 }
 if (passwordData.newPassword !== passwordData.confirmPassword) {
 showErrorToast('새 비밀번호가 일치하지 않습니다.');
 return;
 }

 setIsLoading(true);

 try {
 const res = await fetch('/api/users/me/password', {
 method: 'PATCH',
 headers: {
 'Content-Type': 'application/json',
 },
 credentials: 'include',
 body: JSON.stringify({
 currentPassword: passwordData.currentPassword,
 newPassword: passwordData.newPassword,
 }),
 });

 if (!res.ok) {
 const { message } = await res.json();
 throw new Error(message || '비밀번호 변경 실패');
 }

 setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
 showSuccessToast('비밀번호가 성공적으로 변경되었습니다.');
 } catch (error: any) {
 showErrorToast(error.message || '오류가 발생했습니다.');
 } finally {
 setIsLoading(false);
 }
 };

 return (
 <div className="min-h-full bg-background">
 <div className="absolute inset-0 opacity-5 dark:opacity-10 bg-cross-line-pattern" />

 <div className="relative overflow-hidden bg-card text-foreground">
 <div className="absolute inset-0 bg-overlay/10"></div>
 <div className="absolute inset-0">
 <div className="absolute top-10 left-10 w-20 h-20 bg-card/10 rounded-full animate-pulse" />
 <div className="absolute top-32 right-20 w-16 h-16 bg-card/5 rounded-full " />
 <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-card/10 rounded-full animate-pulse" />
 </div>

 <div className="relative container mx-auto px-4 py-16">
 <div className="max-w-4xl mx-auto">
 <div className="flex items-center gap-6 mb-8">
 <Link href="/mypage" className="inline-flex items-center text-foreground/80 hover:text-primary-foreground transition-colors font-medium">
 <ArrowLeft className="mr-2 h-5 w-5" />
 마이페이지로 돌아가기
 </Link>
 </div>

 <div className="flex items-center gap-6">
 <div className="bg-card/20 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
 <Settings className="h-12 w-12" />
 </div>
 <div>
 <h1 className="text-4xl md:text-5xl font-black mb-2 text-foreground">회원정보 수정</h1>
 <p className="text-xl text-accent">개인정보를 안전하게 관리하세요</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 <div className="container mx-auto px-4 py-12">
 <div className="max-w-4xl mx-auto">
 <Tabs defaultValue="profile" className="space-y-8">
 <Card className="border-0 shadow-2xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
 <CardContent className="p-6">
 <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted">
 <TabsTrigger value="profile" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-card dark:data-[state=active]:bg-card data-[state=active]:shadow-md">
 <User className="h-5 w-5" />
 <span className="text-xs font-medium">기본정보</span>
 </TabsTrigger>
 <TabsTrigger value="password" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-card dark:data-[state=active]:bg-card data-[state=active]:shadow-md">
 <Shield className="h-5 w-5" />
 <span className="text-xs font-medium">비밀번호</span>
 </TabsTrigger>
 <TabsTrigger value="address" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-card dark:data-[state=active]:bg-card data-[state=active]:shadow-md">
 <MapPin className="h-5 w-5" />
 <span className="text-xs font-medium">배송지</span>
 </TabsTrigger>
 <TabsTrigger
 value="tennis-profile"
 className="flex flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground dark:text-foreground data-[state=active]:bg-card data-[state=active]:text-accent data-[state=active]:shadow-md"
 >
 <MdSportsTennis className="h-5 w-5" />
 <span className="text-xs font-medium">테니스 프로필</span>
 </TabsTrigger>
 <TabsTrigger value="preferences" className="flex flex-col items-center gap-2 py-3 data-[state=active]:bg-card dark:data-[state=active]:bg-card data-[state=active]:shadow-md">
 <Bell className="h-5 w-5" />
 <span className="text-xs font-medium">설정</span>
 </TabsTrigger>
 </TabsList>
 </CardContent>
 </Card>

 <TabsContent value="profile">
 <Card className="border-0 shadow-2xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
 <CardHeader className="bg-muted border-b">
 <div className="flex items-center gap-3">
 <div className="bg-accent text-accent-foreground rounded-2xl p-3 shadow-lg">
 <User className="h-6 w-6 text-accent" />
 </div>
 <div>
 <CardTitle className="text-xl">기본정보</CardTitle>
 <CardDescription>개인정보를 수정할 수 있습니다.</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-8 space-y-8">
 <div className="flex items-center gap-6">
 <Avatar className="h-24 w-24 border-4 border-border shadow-xl">
 <AvatarImage src="/placeholder.svg?height=96&width=96" alt="프로필 이미지" />
 <AvatarFallback className="text-2xl bg-accent text-accent-foreground">{profileData.name.charAt(0)}</AvatarFallback>
 </Avatar>
 <div>
 <Button variant="outline" size="sm" onClick={() => showInfoToast('해당 기능은 준비 중입니다.')} className="mb-2 border-border hover:bg-primary/10 dark:hover:bg-primary/20">
 <Camera className="mr-2 h-4 w-4" />
 이미지 변경
 </Button>
 <p className="text-sm text-muted-foreground">JPG, PNG 파일만 업로드 가능합니다</p>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
 <div className="space-y-2">
 <Label htmlFor="name" className="flex items-center gap-2 text-foreground">
 <User className="h-4 w-4" />
 이름 *
 </Label>
 <Input
 id="name"
 value={profileData.name ?? ''}
 onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
 className="h-12 border-border focus:border-border dark:focus:border-border"
 placeholder="이름을 입력해주세요"
 />
 {/* 소셜 가입/연동 제공자 표시 (표시용) */}
 <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
 <span className="font-medium">가입/연동:</span>
 {socialProviders.length ? (
 <>
 {socialProviders.includes('kakao') && (
 <Badge variant="outline" className="border-border bg-warning/10 text-warning dark:border-border dark:bg-warning/10 dark:text-warning">
 카카오
 </Badge>
 )}
 {socialProviders.includes('naver') && (
 <Badge variant="outline" className="border-border bg-primary/10 text-primary dark:border-border dark:bg-primary/20 dark:text-primary">
 네이버
 </Badge>
 )}
 </>
 ) : (
 <span>이메일</span>
 )}
 </div>
 </div>
 <div className="space-y-2">
 <Label htmlFor="email" className="flex items-center gap-2 text-foreground">
 <Mail className="h-4 w-4" />
 이메일 *
 </Label>
 <Input
 id="email"
 type="email"
 value={profileData.email ?? ''}
 onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
 className="h-12 border-border focus:border-border dark:focus:border-border"
 placeholder="example@naver.com"
 />
 </div>
 <div className="space-y-2 md:col-span-2">
 <Label htmlFor="phone" className="flex items-center gap-2 text-foreground">
 <Phone className="h-4 w-4" />
 전화번호
 </Label>
 <Input
 id="phone"
 value={profileData.phone ?? ''}
 onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
 className="h-12 border-border focus:border-border dark:focus:border-border"
 placeholder="01012345678"
 />
 </div>
 </div>

 <div className="flex justify-end">
 <Button onClick={handleSave} disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300">
 <Save className="mr-2 h-4 w-4" />
 {isLoading ? '저장 중...' : '저장'}
 </Button>
 </div>
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="password">
 <Card className="border-0 shadow-2xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
 <CardHeader className="bg-muted border-b">
 <div className="flex items-center gap-3">
 <div className="bg-primary/10 text-primary rounded-2xl p-3 shadow-lg">
 <Shield className="h-6 w-6 text-primary" />
 </div>
 <div>
 <CardTitle className="text-xl">비밀번호 변경</CardTitle>
 <CardDescription>보안을 위해 정기적으로 비밀번호를 변경해주세요.</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-8 space-y-6">
 <div className="space-y-2">
 <Label htmlFor="currentPassword" className="text-foreground">
 현재 비밀번호 *
 </Label>
 <Input
 id="currentPassword"
 type="password"
 value={passwordData.currentPassword}
 onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
 className="h-12 border-border focus:border-border dark:focus:border-border"
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="newPassword" className="text-foreground">
 새 비밀번호 *
 </Label>
 <Input
 id="newPassword"
 type="password"
 value={passwordData.newPassword}
 onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
 className="h-12 border-border focus:border-border dark:focus:border-border"
 />
 <p className="text-sm text-muted-foreground">8자 이상, 영문/숫자 조합으로 입력해주세요. (특수문자는 선택)</p>
 </div>
 <div className="space-y-2">
 <Label htmlFor="confirmPassword" className="text-foreground">
 새 비밀번호 확인 *
 </Label>
 <Input
 id="confirmPassword"
 type="password"
 value={passwordData.confirmPassword}
 onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
 className="h-12 border-border focus:border-border dark:focus:border-border"
 />
 </div>

 <div className="flex justify-end">
 <Button onClick={handlePasswordChange} disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300">
 <Save className="mr-2 h-4 w-4" />
 {isLoading ? '변경 중...' : '비밀번호 변경'}
 </Button>
 </div>
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="address">
 <Card className="border-0 shadow-2xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
 <CardHeader className="bg-muted border-b">
 <div className="flex items-center gap-3">
 <div className="bg-muted/10 text-primary rounded-2xl p-3 shadow-lg">
 <MapPin className="h-6 w-6 text-primary" />
 </div>
 <div>
 <CardTitle className="text-xl">배송지 관리</CardTitle>
 <CardDescription>기본 배송지 정보를 관리할 수 있습니다.</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-8 space-y-6">
 <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
 <div className="space-y-2">
 <Label htmlFor="zipCode" className="text-foreground">
 우편번호
 </Label>
 <div className="flex gap-2">
 <Input id="postalCode" value={profileData.address.postalCode} readOnly className="h-12 bg-muted text-muted-foreground cursor-default" placeholder="12345" />
 <Button type="button" onClick={handleAddressSearch} className="h-12 px-6 bg-transparent border-border text-accent hover:bg-primary/10 dark:hover:bg-primary/20" variant="outline">
 검색
 </Button>
 </div>
 </div>
 </div>
 <div className="space-y-2">
 <Label htmlFor="address1" className="text-foreground">
 주소
 </Label>
 <Input id="address1" value={profileData.address.address1} readOnly className="h-12 bg-muted text-muted-foreground cursor-default" placeholder="주소 검색 버튼을 클릭해주세요" />
 </div>
 <div className="space-y-2">
 <Label htmlFor="address2" className="text-foreground">
 상세주소
 </Label>
 <Input
 id="address2"
 value={profileData.address.address2}
 onChange={(e) =>
 setProfileData({
 ...profileData,
 address: { ...profileData.address, address2: e.target.value },
 })
 }
 className="h-12 border-border focus:border-border dark:focus:border-border"
 placeholder="동, 호수 등 상세주소"
 />
 </div>

 <div className="flex justify-end">
 <Button onClick={handleSave} disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300">
 <Save className="mr-2 h-4 w-4" />
 {isLoading ? '저장 중...' : '저장'}
 </Button>
 </div>
 </CardContent>
 </Card>
 </TabsContent>

 <TabsContent value="tennis-profile">
 <TennisProfileForm />
 </TabsContent>

 <TabsContent value="preferences">
 <div className="space-y-8">
 <Card className="border-0 shadow-2xl bg-card/95 dark:bg-card/95 backdrop-blur-sm">
 <CardHeader className="bg-muted border-b">
 <div className="flex items-center gap-3">
 <div className="bg-accent text-accent-foreground rounded-2xl p-3 shadow-lg">
 <Bell className="h-6 w-6 text-accent-foreground" />
 </div>
 <div>
 <CardTitle className="text-xl">마케팅 수신 동의</CardTitle>
 <CardDescription>마케팅 정보 수신 방법을 선택할 수 있습니다.</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-8 space-y-6">
 <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
 <div>
 <Label htmlFor="email-marketing" className="font-medium text-foreground">
 이메일 수신
 </Label>
 <p className="text-sm text-muted-foreground">할인 쿠폰, 신상품 소식을 이메일로 받아보세요.</p>
 </div>
 <Switch
 id="email-marketing"
 checked={profileData.marketing?.email ?? false}
 onCheckedChange={(checked) =>
 setProfileData({
 ...profileData,
 marketing: { ...profileData.marketing, email: checked },
 })
 }
 />
 </div>
 <Separator />
 <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
 <div>
 <Label htmlFor="sms-marketing" className="font-medium text-foreground">
 SMS 수신
 </Label>
 <p className="text-sm text-muted-foreground">주문 상태, 배송 정보를 SMS로 받아보세요.</p>
 </div>
 <Switch
 id="sms-marketing"
 checked={profileData.marketing?.sms ?? false}
 onCheckedChange={(checked) =>
 setProfileData({
 ...profileData,
 marketing: { ...profileData.marketing, sms: checked },
 })
 }
 />
 </div>
 <Separator />
 <div className="flex items-center justify-between p-4 bg-muted rounded-xl">
 <div>
 <Label htmlFor="push-marketing" className="font-medium text-foreground">
 앱 푸시 알림
 </Label>
 <p className="text-sm text-muted-foreground">앱을 통해 실시간 알림을 받아보세요.</p>
 </div>
 <Switch
 id="push-marketing"
 checked={profileData.marketing?.push ?? false}
 onCheckedChange={(checked) =>
 setProfileData({
 ...profileData,
 marketing: { ...profileData.marketing, push: checked },
 })
 }
 />
 </div>

 <div className="flex justify-end">
 <Button onClick={handleSave} disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300">
 <Save className="mr-2 h-4 w-4" />
 {isLoading ? '저장 중...' : '저장'}
 </Button>
 </div>
 </CardContent>
 </Card>

 <Card className="border-0 shadow-2xl bg-card/95 dark:bg-card/95 backdrop-blur-sm border border-destructive/30">
 <CardHeader className="bg-destructive/10 dark:bg-destructive/15 border-b border-destructive/30">
 <div className="flex items-center gap-3">
 <div className="bg-destructive/10 dark:bg-destructive/15 text-destructive rounded-2xl p-3 shadow-lg">
 <AlertTriangle className="h-6 w-6 text-destructive" />
 </div>
 <div>
 <CardTitle className="text-xl text-destructive">회원 탈퇴</CardTitle>
 <CardDescription>계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.</CardDescription>
 </div>
 </div>
 </CardHeader>
 <CardContent className="p-8">
 {showWithdrawalForm ? (
 <WithdrawalReasonSelect
 onSubmit={async (reason, detail) => {
 try {
 const res = await fetch('/api/users/me/leave', {
 method: 'DELETE',
 headers: {
 'Content-Type': 'application/json',
 },
 credentials: 'include',
 body: JSON.stringify({
 reason,
 detail,
 }),
 });

 if (!res.ok) {
 const errBody = await res.json().catch(() => ({ error: '알 수 없는 오류' }));
 throw new Error(errBody.error);
 }

 // 탈퇴 성공 흐름
 } catch (error: any) {
 showErrorToast(error.message || '회원 탈퇴 중 오류가 발생했습니다.');
 }
 }}
 />
 ) : (
 <div className="text-center">
 <div className="bg-destructive/10 dark:bg-destructive/15 border border-destructive/30 rounded-xl p-6 mb-6">
 <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
 <h3 className="text-lg font-semibold text-destructive mb-2">정말로 탈퇴하시겠습니까?</h3>
 <p className="text-sm text-muted-foreground">탈퇴 시 모든 개인정보와 이용기록이 삭제되며, 복구할 수 없습니다.</p>
 </div>
 <Button
 variant="destructive"
 type="button"
 onClick={() => setShowWithdrawalForm(true)}
 className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg hover:shadow-xl transition-all duration-300"
 >
 <AlertTriangle className="mr-2 h-4 w-4" />
 회원 탈퇴
 </Button>
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 </TabsContent>
 </Tabs>
 </div>
 </div>
 </div>
 );
}
