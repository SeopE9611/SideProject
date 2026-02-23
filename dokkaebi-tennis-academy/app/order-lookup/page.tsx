'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { ArrowLeft, Search, Mail, User, Phone, Package, Shield, Clock } from 'lucide-react';
import LoginGate from '@/components/system/LoginGate';
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/hooks/useUnsavedChangesGuard';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: string) => v.replace(/\D/g, '');
const isValidKoreanPhoneDigits = (digits: string) => digits.length === 10 || digits.length === 11;

export default function OrderLookupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 비회원 주문 조회(게스트) UI 노출 여부(클라)
  // - NEXT_PUBLIC_GUEST_ORDER_MODE=off 면: 입력 폼부터 막고 LoginGate로 유도
  // - legacy/on 면: 조회 UI 유지
  const guestModeRaw = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  const allowGuestLookup = guestModeRaw !== 'off';

  // 입력이 한 글자라도 있으면 dirty로 간주(프리필/초기값 없음)
  const isDirty = !!formData.name.trim() || !!formData.email.trim() || !!formData.phone.trim();

  // 새로고침/탭 닫기/브라우저 뒤로가기(주소창) 등 브라우저 레벨 이탈 경고
  // - router.push(조회 성공 후 결과 페이지 이동)는 의도된 이동이라 guard 불필요
  useUnsavedChangesGuard(allowGuestLookup && isDirty && !isSubmitting);

  // 내부 링크 클릭(예: 로그인으로 돌아가기) 시 confirm 경고
  const onLeaveToLoginClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isDirty || isSubmitting) return;
    const ok = window.confirm(UNSAVED_CHANGES_MESSAGE);
    if (!ok) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (!allowGuestLookup) return <LoginGate next="/mypage" variant="orderLookup" />;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // phone은 입력 중에도 숫자만 유지 (사용자가 '-' 넣어도 자동 제거)
    // - 서버는 digits(10~11자리)만 허용
    // - 클라에서도 동일하게 맞춰서 UX + 안정성 확보
    if (name === 'phone') {
      const digits = onlyDigits(value).slice(0, 11); // 너무 긴 입력 방지(최대 11자리)
      setFormData((prev) => ({ ...prev, phone: digits }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      name: '',
      email: '',
      phone: '',
    };
    let isValid = true;

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phoneDigits = formData.phone ? onlyDigits(formData.phone) : '';

    if (!name) {
      newErrors.name = '이름을 입력해주세요';
      isValid = false;
    } else if (name.length > 50) {
      newErrors.name = '이름은 50자 이내로 입력해주세요';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
      isValid = false;
    } else if (!EMAIL_RE.test(email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요';
      isValid = false;
    } else if (email.length > 254) {
      newErrors.email = '이메일이 너무 깁니다';
      isValid = false;
    }

    // phone은 선택이지만, 입력했으면 digits 10~11자리만 허용
    if (phoneDigits && !isValidKoreanPhoneDigits(phoneDigits)) {
      newErrors.phone = '전화번호는 숫자 10~11자리만 입력해주세요';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // - name/email: trim
      // - phone: digits만 (빈 값이면 아예 제외 가능)
      const normalizedName = formData.name.trim();
      const normalizedEmail = formData.email.trim();
      const normalizedPhone = formData.phone ? onlyDigits(formData.phone) : '';

      const payload: { name: string; email: string; phone?: string } = {
        name: normalizedName,
        email: normalizedEmail,
      };
      if (normalizedPhone) payload.phone = normalizedPhone;

      // 성공 시 주문 결과 페이지로 이동 (예시)
      // router.push(`/order-results?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`)

      // 임시로 3초 후 완료되는 것으로 시뮬레이션
      const res = await fetch('/api/guest-orders/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json();

      // 400(유효성 실패)도 여기로 들어오므로, success/ok 기준으로 분기
      if (!res.ok || !data?.success) {
        alert(data?.error ?? '요청 값이 올바르지 않습니다.');
        return;
      }

      if (data.orders.length > 0) {
        alert(`총 ${data.orders.length}개의 주문을 찾았습니다.`);
        // results 페이지에도 "정규화된 값"을 넘김
        const qs = new URLSearchParams();
        qs.set('name', normalizedName);
        qs.set('email', normalizedEmail);
        if (normalizedPhone) qs.set('phone', normalizedPhone);

        router.push(`/order-lookup/results?${qs.toString()}`);
      } else {
        alert('조회된 주문이 없습니다.');
      }
    } catch (error) {
      console.error('주문 조회 중 오류 발생:', error);
      alert('주문 조회 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border bg-muted/30 dark:bg-card/40">
        <div className="absolute inset-0 bg-overlay/10"></div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center text-foreground">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-card/20 backdrop-blur-sm rounded-full mb-6">
              <Search className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">비회원 주문 조회</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">주문 시 입력하신 정보로 간편하게 주문 내역을 확인하세요</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-12 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Link href="/login" onClick={onLeaveToLoginClick} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors group">
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              이전 페이지로 돌아가기
            </Link>
          </div>

          {/* Main Card */}
          <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4 mx-auto">
                <Package className="w-6 h-6 text-foreground" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">주문 정보 입력</CardTitle>
              <CardDescription className="text-base text-muted-foreground">주문 시 입력하신 정보를 통해 주문 내역을 확인하실 수 있습니다</CardDescription>
            </CardHeader>

            <Separator className="mx-6" />

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6 pt-8">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    이름 <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      name="name"
                      placeholder="홍길동"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className={`pl-10 h-12 border-2 transition-all duration-200 ${errors.name ? 'border-destructive focus:border-destructive' : 'border-border focus:border-border hover:border-border'}`}
                    />
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <span className="w-1 h-1 bg-destructive rounded-full"></span>
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary" />
                    이메일 <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="example@dokkaebi.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={`pl-10 h-12 border-2 transition-all duration-200 ${errors.email ? 'border-destructive focus:border-destructive' : 'border-border focus:border-border hover:border-border'}`}
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <span className="w-1 h-1 bg-destructive rounded-full"></span>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-primary" />
                    전화번호 (선택)
                  </Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="01012345678 (- 제외)"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10 h-12 border-2 border-border focus:border-border hover:border-border transition-all duration-200"
                    />
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <span className="w-1 h-1 bg-destructive rounded-full"></span>
                      {errors.phone}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    주문 시 입력하신 전화번호를 입력해주세요.
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Clock className="w-5 h-5 text-primary mt-0.5" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-accent-foreground mb-1">조회 가능한 주문</p>
                      <p className="text-primary">최근 6개월 이내의 주문 내역을 조회하실 수 있습니다.</p>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pt-2 pb-8">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-border/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      조회 중...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      주문 조회하기
                    </div>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  회원이신가요?{' '}
                  <Link href="/login" className="text-primary hover:text-primary font-medium">
                    로그인하기
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6 bg-card/60 backdrop-blur-sm rounded-xl border border-border">
              <div className="inline-flex items-center justify-center w-12 h-12 border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20 rounded-full mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">안전한 조회</h3>
              <p className="text-sm text-muted-foreground">개인정보 보호를 위한 안전한 주문 조회 시스템</p>
            </div>

            <div className="text-center p-6 bg-card/60 backdrop-blur-sm rounded-xl border border-border">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-success/10 rounded-full mb-4">
                <Clock className="w-6 h-6 text-success" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">실시간 조회</h3>
              <p className="text-sm text-muted-foreground">최신 주문 상태를 실시간으로 확인 가능</p>
            </div>

            <div className="text-center p-6 bg-card/60 backdrop-blur-sm rounded-xl border border-border">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-muted rounded-full mb-4">
                <Package className="w-6 h-6 text-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">상세 정보</h3>
              <p className="text-sm text-muted-foreground">배송 추적부터 결제 정보까지 한눈에</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
