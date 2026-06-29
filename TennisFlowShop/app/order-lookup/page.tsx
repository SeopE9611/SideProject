"use client";

import type React from "react";

import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, SummaryCard } from "@/components/public";
import LoginGate from "@/components/system/LoginGate";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Mail,
  Package,
  Phone,
  Search,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const onlyDigits = (v: string) => v.replace(/\D/g, "");
const isValidKoreanPhoneDigits = (digits: string) => digits.length === 10 || digits.length === 11;
type LookupNotice = { type: "error"; message: string } | { type: "empty"; message: string } | null;

export default function OrderLookupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [lookupNotice, setLookupNotice] = useState<LookupNotice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 비회원 주문 조회(게스트) UI 노출 여부(클라)
  // - NEXT_PUBLIC_GUEST_ORDER_MODE=off 면: 입력 폼부터 막고 LoginGate로 유도
  // - legacy/on 면: 조회 UI 유지
  const guestModeRaw = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? "legacy").trim();
  const allowGuestLookup = guestModeRaw !== "off";

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
    if (name === "phone") {
      const digits = onlyDigits(value).slice(0, 11); // 너무 긴 입력 방지(최대 11자리)
      setFormData((prev) => ({ ...prev, phone: digits }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setLookupNotice(null);
  };

  const validateForm = () => {
    const newErrors = {
      name: "",
      email: "",
      phone: "",
    };
    let isValid = true;

    const name = formData.name.trim();
    const email = formData.email.trim();
    const phoneDigits = formData.phone ? onlyDigits(formData.phone) : "";

    if (!name) {
      newErrors.name = "이름을 입력해주세요";
      isValid = false;
    } else if (name.length > 50) {
      newErrors.name = "이름은 50자 이내로 입력해주세요";
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = "이메일을 입력해주세요";
      isValid = false;
    } else if (!EMAIL_RE.test(email)) {
      newErrors.email = "유효한 이메일 주소를 입력해주세요";
      isValid = false;
    } else if (email.length > 254) {
      newErrors.email = "이메일이 너무 깁니다";
      isValid = false;
    }

    // phone은 선택이지만, 입력했으면 digits 10~11자리만 허용
    if (phoneDigits && !isValidKoreanPhoneDigits(phoneDigits)) {
      newErrors.phone = "전화번호는 숫자 10~11자리만 입력해주세요";
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
      const normalizedPhone = formData.phone ? onlyDigits(formData.phone) : "";

      const payload: { name: string; email: string; phone?: string } = {
        name: normalizedName,
        email: normalizedEmail,
      };
      if (normalizedPhone) payload.phone = normalizedPhone;

      // 성공 시 주문 결과 페이지로 이동 (예시)
      // router.push(`/order-results?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`)

      // 임시로 3초 후 완료되는 것으로 시뮬레이션
      const res = await fetch("/api/guest-orders/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json();

      // 400(유효성 실패)도 여기로 들어오므로, success/ok 기준으로 분기
      if (!res.ok || !data?.success) {
        setLookupNotice({
          type: "error",
          message: data?.error ?? "입력하신 정보를 확인한 뒤 다시 조회해주세요.",
        });
        return;
      }

      if (data.orders.length > 0) {
        // results 페이지에도 "정규화된 값"을 넘김
        const qs = new URLSearchParams();
        qs.set("name", normalizedName);
        qs.set("email", normalizedEmail);
        if (normalizedPhone) qs.set("phone", normalizedPhone);

        router.push(`/order-lookup/results?${qs.toString()}`);
      } else {
        setLookupNotice({
          type: "empty",
          message:
            "입력하신 정보와 주문 시 입력한 정보가 정확히 일치하는지 확인한 뒤 다시 조회해주세요.",
        });
      }
    } catch (error) {
      console.error("주문 조회 중 오류 발생:", error);
      setLookupNotice({
        type: "error",
        message: "주문 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-background">
      <PublicPageHero
        align="center"
        eyebrow="비회원 주문 조회"
        title="비회원 주문 조회"
        description="주문번호를 몰라도 주문 시 입력한 이름, 이메일, 연락처로 주문/신청 상태와 다음 해야 할 일을 확인할 수 있어요."
      >
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card shadow-sm">
          <Search className="h-7 w-7" />
        </div>
      </PublicPageHero>

      <SiteContainer className="py-8 md:py-12">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="mb-0 lg:col-span-2">
            <Link
              href="/login"
              onClick={onLeaveToLoginClick}
              className="inline-flex items-center text-ui-label font-medium text-muted-foreground transition-colors hover:text-foreground group"
            >
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              이전 페이지로 돌아가기
            </Link>
          </div>

          <SummaryCard
            className="order-2 text-ui-body-sm text-muted-foreground lg:order-none lg:sticky lg:top-24"
            contentClassName="space-y-2"
            title="조회 후 확인할 수 있는 정보"
          >
            <p>
              현재 상태, 다음 해야 할 일, 문의가 필요한 경우의 안내를 함께 보여드립니다.
              회원가입하면 다음부터 마이페이지에서 더 쉽게 관리할 수 있어요.
            </p>
          </SummaryCard>

          <div className="min-w-0">
            {/* Main Card */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="text-center pb-6 md:pb-8">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary rounded-full mb-4 mx-auto border border-border/60">
                  <Package className="w-6 h-6 text-foreground" />
                </div>
                <CardTitle className="text-ui-card-title-lg font-semibold text-foreground">주문 정보 입력</CardTitle>
                <CardDescription className="text-ui-body text-muted-foreground">
                  주문 시 입력하신 정보를 통해 주문 내역을 확인하실 수 있습니다
                </CardDescription>
              </CardHeader>

              <Separator className="mx-6" />

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4 md:space-y-6 pt-6 md:pt-8">
                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-ui-label font-medium flex items-center gap-2">
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
                        className={`pl-10 h-12 border-2 transition-[border-color,box-shadow] duration-200 ${errors.name ? "border-destructive focus:border-destructive" : "border-border focus:border-border hover:border-border"}`}
                      />
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                    {errors.name && (
                      <p className="text-ui-label text-destructive flex items-center gap-1">
                        <span className="w-1 h-1 bg-destructive rounded-full"></span>
                        {errors.name}
                      </p>
                    )}
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-ui-label font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" />
                      이메일 <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="example@dokkaebitennis.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className={`pl-10 h-12 border-2 transition-[border-color,box-shadow] duration-200 ${errors.email ? "border-destructive focus:border-destructive" : "border-border focus:border-border hover:border-border"}`}
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                    {errors.email && (
                      <p className="text-ui-label text-destructive flex items-center gap-1">
                        <span className="w-1 h-1 bg-destructive rounded-full"></span>
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Phone Field */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-ui-label font-medium flex items-center gap-2">
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
                        className="pl-10 h-12 border-2 border-border focus:border-border hover:border-border transition-[border-color,box-shadow] duration-200"
                      />
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    </div>
                    {errors.phone && (
                      <p className="text-ui-label text-destructive flex items-center gap-1">
                        <span className="w-1 h-1 bg-destructive rounded-full"></span>
                        {errors.phone}
                      </p>
                    )}
                    <p className="text-ui-label text-muted-foreground flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      주문 시 입력하신 전화번호를 입력해주세요.
                    </p>
                  </div>

                  {/* Info Box */}
                  <div className="bg-secondary border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <Clock className="w-5 h-5 text-primary mt-0.5" />
                      </div>
                      <div className="text-ui-body-sm">
                        <p className="font-medium text-foreground mb-1">조회 가능한 주문</p>
                        <p className="text-muted-foreground">
                          최근 6개월 이내의 주문 내역을 조회하실 수 있습니다.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-border pt-4 text-ui-body-sm">
                      <p className="font-medium text-foreground mb-2">조회 전 확인해주세요</p>
                      <ul className="space-y-1.5 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                          <span>
                            비회원 주문은 주문 시 입력한 이름과 이메일이 정확히 일치해야 조회할 수
                            있습니다.
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                          <span>전화번호를 입력한 경우 주문 시 전화번호와도 일치해야 합니다.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                          <span>최근 6개월 이내 주문만 조회됩니다.</span>
                        </li>
                      </ul>
                      <ul className="mt-3 space-y-1.5 text-muted-foreground">
                        <li>• 주문자 이름에 띄어쓰기나 오타가 없는지 확인해주세요.</li>
                        <li>• 주문 당시 사용한 이메일 주소를 입력해주세요.</li>
                        <li>• 전화번호는 입력했다면 숫자만 10~11자리로 입력해주세요.</li>
                        <li>• 주문 완료 직후라면 잠시 후 다시 조회해주세요.</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-3 md:gap-4 pt-2 pb-6 md:pb-8">
                  {lookupNotice && (
                    <div
                      className={cn(
                        "w-full rounded-lg border p-4 text-ui-body-sm",
                        lookupNotice.type === "error"
                          ? "border-destructive/40 bg-destructive/5 text-destructive"
                          : "border-border bg-muted/40 text-foreground",
                      )}
                      role={lookupNotice.type === "error" ? "alert" : "status"}
                    >
                      <p className="font-medium">
                        {lookupNotice.type === "empty"
                          ? "주문을 찾지 못했어요"
                          : "조회 중 문제가 발생했어요"}
                      </p>
                      <p className="mt-1 text-ui-body-sm">{lookupNotice.message}</p>
                      {lookupNotice.type === "empty" && (
                        <>
                          <ul className="mt-3 space-y-1.5 text-ui-body-sm text-muted-foreground">
                            <li>• 주문자 이름에 띄어쓰기나 오타가 없는지 확인해주세요.</li>
                            <li>• 주문 당시 사용한 이메일 주소인지 확인해주세요.</li>
                            <li>• 전화번호를 입력했다면 주문 당시 번호와 같은지 확인해주세요.</li>
                            <li>• 최근 6개월 이내 주문인지 확인해주세요.</li>
                          </ul>
                          <p className="mt-3 text-ui-body-sm text-muted-foreground">
                            계속 조회되지 않는다면
                            <Link
                              href="/board/qna/write"
                              className="ml-1 font-medium text-primary hover:underline"
                            >
                              고객센터 문의로 남겨주세요.
                            </Link>
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    className="h-12 w-full font-semibold"
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

                  <p className="text-ui-caption text-center text-muted-foreground">
                    회원이신가요?{" "}
                    <Link href="/login" className="text-primary hover:text-primary font-medium">
                      로그인하기
                    </Link>
                  </p>
                </CardFooter>
              </form>
            </Card>

            {/* Features */}
            <div className="grid grid-cols-1 gap-4 md:mt-8">
              <div className="text-center p-4 md:p-6 bg-card rounded-xl border border-border shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 border border-border bg-secondary text-foreground rounded-full mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">안전한 조회</h3>
                <p className="text-ui-body-sm text-muted-foreground">
                  개인정보 보호를 위한 안전한 주문 조회 시스템
                </p>
              </div>

              <div className="text-center p-4 md:p-6 bg-card rounded-xl border border-border shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-success/10 rounded-full mb-4 dark:bg-success/15">
                  <Clock className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">실시간 조회</h3>
                <p className="text-ui-body-sm text-muted-foreground">
                  최신 주문 상태를 실시간으로 확인 가능
                </p>
              </div>

              <div className="text-center p-4 md:p-6 bg-card rounded-xl border border-border shadow-sm">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-muted rounded-full mb-4">
                  <Package className="w-6 h-6 text-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">상세 정보</h3>
                <p className="text-ui-body-sm text-muted-foreground">배송 추적부터 결제 정보까지 한눈에</p>
              </div>
            </div>
          </div>
        </div>
      </SiteContainer>
    </div>
  );
}
