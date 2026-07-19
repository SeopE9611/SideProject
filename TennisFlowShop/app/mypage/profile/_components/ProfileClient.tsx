"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Save,
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Bell,
  AlertTriangle,
} from "lucide-react";
import SiteContainer from "@/components/layout/SiteContainer";
import { PublicPageHero, PublicSurface } from "@/components/public";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { showErrorToast, showInfoToast, showSuccessToast } from "@/lib/toast";
import { loadDaumPostcode } from "@/lib/loadDaumPostcode";
import WithdrawalReasonSelect from "@/app/mypage/profile/_components/WithdrawalReasonSelect";
import { useRouter } from "next/navigation";
import { MdSportsTennis } from "react-icons/md";
import TennisProfileForm from "@/app/mypage/profile/_components/TennisProfileForm";
import { Badge } from "@/components/ui/badge";
import { IdentityBadge } from "@/components/ui/identity-badge";
import {
  UNSAVED_CHANGES_MESSAGE,
  useUnsavedChangesGuard,
} from "@/lib/hooks/useUnsavedChangesGuard";
import { getReservedDisplayNameErrorMessage } from "@/lib/reserved-display-name";

// 제출 직전 최종 유효성 가드
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const POSTAL_RE = /^\d{5}$/;
const onlyDigits = (v: string) => String(v ?? "").replace(/\D/g, "");
const isValidKoreanPhone = (v: string) => {
  const d = onlyDigits(v);
  return d.length === 10 || d.length === 11; // 01012345678 / 0212345678 등
};
// "8자 이상 + 영문/숫자 조합" (특수문자는 허용)
const PW_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// ProfileClient에서 “이탈 경고 기준”으로 삼을 필드만 뽑아 시그니처 문자열로 만듦(비교용)
const profileDirtySignature = (d: {
  name?: string;
  email?: string;
  phone?: string;
  address?: { postalCode?: string; address1?: string; address2?: string };
  marketing?: { email?: boolean; sms?: boolean; push?: boolean };
}) =>
  JSON.stringify({
    name: String(d.name ?? "").trim(),
    email: String(d.email ?? "").trim(),
    phone: String(d.phone ?? "").trim(),
    address: {
      postalCode: String(d.address?.postalCode ?? "").trim(),
      address1: String(d.address?.address1 ?? "").trim(),
      address2: String(d.address?.address2 ?? "").trim(),
    },
    marketing: {
      email: !!d.marketing?.email,
      sms: !!d.marketing?.sms,
      push: !!d.marketing?.push,
    },
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
  const [initialProfileSig, setInitialProfileSig] = useState("");

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    gender: "",
    address: {
      postalCode: "",
      address1: "",
      address2: "",
    },
    marketing: {
      email: false,
      sms: false,
      push: false,
    },
  });

  // 소셜 로그인 제공자(표시용): /api/users/me에서 내려주는 oauthProviders
  const [socialProviders, setSocialProviders] = useState<Array<"kakao" | "naver">>([]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);

  // 현재 입력 상태 시그니처(편집 가능한 핵심 필드만 비교)
  const currentProfileSig = useMemo(() => profileDirtySignature(profileData), [profileData]);
  const isProfileDirty = Boolean(initialProfileSig) && currentProfileSig !== initialProfileSig;

  // 비밀번호 탭: 입력 중이면 dirty (서버 baseline 필요 없음)
  const isPasswordDirty = Boolean(
    passwordData.currentPassword || passwordData.newPassword || passwordData.confirmPassword,
  );
  const isDirty = isProfileDirty || isPasswordDirty;

  // 최종 dirty (프로필/주소/마케팅 변경 OR 비밀번호 입력 중)
  useUnsavedChangesGuard(isDirty);
  const confirmLeaveIfDirty = () => !isDirty || window.confirm(UNSAVED_CHANGES_MESSAGE);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/users/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });
        if (!res.ok) throw new Error("정보를 불러올 수 없습니다");

        const user = await res.json();
        setSocialProviders(
          Array.isArray((user as any).oauthProviders) ? (user as any).oauthProviders : [],
        );

        const { address, postalCode, addressDetail, ...rest } = user;

        // 최신 state 기반으로 안전하게 병합(closure stale 방지)
        setProfileData((prev) => {
          const next = {
            ...prev,
            ...rest,
            address: {
              address1: address ?? "",
              postalCode: postalCode ?? "",
              address2: addressDetail ?? "",
            },
          };
          // baseline은 “서버 로드 성공 시점”의 값으로 1회만 세팅
          setInitialProfileSig((sig) => sig || profileDirtySignature(next));
          return next;
        });
      } catch (err) {
        console.error(err);
        showErrorToast("회원 정보를 불러오는 중 오류가 발생했습니다.");
      }
    };

    fetchProfile();
  }, []);

  // 우편 번호 검색
  const handleAddressSearch = async () => {
    try {
      await loadDaumPostcode();
    } catch {
      showErrorToast("주소 검색 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    if (!window?.daum?.Postcode) return;
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
    const nameTrim = String(profileData.name ?? "").trim();
    const emailTrim = String(profileData.email ?? "").trim();
    const phoneDigits = onlyDigits(profileData.phone ?? "");

    // 필수값(화면에도 *로 표시되어 있음)
    if (!nameTrim || nameTrim.length < 2) {
      showErrorToast("이름을 확인해주세요. (2자 이상)");
      return;
    }
    const reservedNameError = getReservedDisplayNameErrorMessage(nameTrim);
    if (reservedNameError) {
      showErrorToast(reservedNameError);
      return;
    }
    if (!emailTrim || !EMAIL_RE.test(emailTrim)) {
      showErrorToast("이메일 형식을 확인해주세요.");
      return;
    }

    // 전화번호는 UI상 필수 표시는 아니지만, 입력했다면 형식은 맞아야 함
    if (phoneDigits && !isValidKoreanPhone(phoneDigits)) {
      showErrorToast("전화번호는 숫자 10~11자리로 입력해주세요.");
      return;
    }

    // 주소를 저장하려는 경우(주소/우편번호 중 하나라도 있으면) 우편번호 5자리 검증
    const basicAddress = String(profileData.address?.address1 ?? "").trim();
    const detailedAddress = String(profileData.address?.address2 ?? "").trim();
    const postalCode = String(profileData.address?.postalCode ?? "").trim();
    const hasAnyAddress = Boolean(basicAddress || detailedAddress || postalCode);
    if (hasAnyAddress && (!postalCode || !POSTAL_RE.test(postalCode))) {
      showErrorToast("우편번호(5자리)를 확인해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const basicAddress = profileData.address.address1.trim();
      const detailedAddress = profileData.address.address2.trim();
      const postalCode = profileData.address.postalCode;

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
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

      if (!res.ok) throw new Error("저장 실패");

      showSuccessToast("회원 정보가 성공적으로 저장되었습니다.");
      // 저장 성공 → 현재 상태를 baseline으로 갱신(이탈 경고 해제)
      setInitialProfileSig(profileDirtySignature(profileData));
    } catch (err) {
      console.error(err);
      showErrorToast("오류가 발생했습니다. 다시 시도해주세요.");
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
      showErrorToast("현재 비밀번호를 입력해주세요.");
      return;
    }
    if (!next) {
      showErrorToast("새 비밀번호를 입력해주세요.");
      return;
    }
    if (!PW_RE.test(next)) {
      showErrorToast("새 비밀번호는 8자 이상이며 영문/숫자 조합이어야 합니다.");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showErrorToast("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (!res.ok) {
        const { message } = await res.json();
        throw new Error(message || "비밀번호 변경 실패");
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showSuccessToast("비밀번호가 성공적으로 변경되었습니다.");
    } catch (error: any) {
      showErrorToast(error.message || "오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-background">
      <PublicPageHero
        variant="feature"
        eyebrow="계정 설정"
        title="회원 정보 관리"
        description="계정, 배송지와 테니스 프로필을 한곳에서 안전하게 관리하세요."
        actions={
          <Button asChild variant="outline" className="w-full gap-2 sm:w-auto">
            <Link
              href="/mypage"
              onClick={(e) => {
                if (confirmLeaveIfDirty()) return;
                e.preventDefault();
              }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              마이페이지로 돌아가기
            </Link>
          </Button>
        }
      />

      <SiteContainer className="py-8 md:py-12">
        <div className="mx-auto max-w-4xl">
          <Tabs defaultValue="profile" className="space-y-6 md:space-y-8">
            <PublicSurface variant="feature" padding="sm">
              <div className="w-full overflow-x-auto">
                <TabsList className="flex h-auto min-w-max gap-1 rounded-control bg-brand-muted/55 p-1 sm:grid sm:w-full sm:min-w-0 sm:grid-cols-5">
                  <TabsTrigger
                    value="profile"
                    className="min-w-24 flex-1 flex-col items-center gap-1.5 rounded-control px-3 py-3 data-[state=active]:bg-card data-[state=active]:text-brand-highlight-ink data-[state=active]:shadow-soft"
                  >
                    <User className="h-5 w-5" aria-hidden="true" />
                    <span className="text-ui-label font-medium">기본정보</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="password"
                    className="min-w-24 flex-1 flex-col items-center gap-1.5 rounded-control px-3 py-3 data-[state=active]:bg-card data-[state=active]:text-brand-highlight-ink data-[state=active]:shadow-soft"
                  >
                    <Shield className="h-5 w-5" aria-hidden="true" />
                    <span className="text-ui-label font-medium">비밀번호</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="address"
                    className="min-w-24 flex-1 flex-col items-center gap-1.5 rounded-control px-3 py-3 data-[state=active]:bg-card data-[state=active]:text-brand-highlight-ink data-[state=active]:shadow-soft"
                  >
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                    <span className="text-ui-label font-medium">배송지</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="tennis-profile"
                    className="min-w-24 flex-1 flex-col items-center justify-center gap-1.5 rounded-control px-3 py-3 text-ui-label font-medium data-[state=active]:bg-card data-[state=active]:text-brand-highlight-ink data-[state=active]:shadow-soft"
                  >
                    <MdSportsTennis className="h-5 w-5" aria-hidden="true" />
                    <span className="text-ui-label font-medium">테니스 프로필</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="preferences"
                    className="min-w-24 flex-1 flex-col items-center gap-1.5 rounded-control px-3 py-3 data-[state=active]:bg-card data-[state=active]:text-brand-highlight-ink data-[state=active]:shadow-soft"
                  >
                    <Bell className="h-5 w-5" aria-hidden="true" />
                    <span className="text-ui-label font-medium">설정</span>
                  </TabsTrigger>
                </TabsList>
              </div>
            </PublicSurface>

            <TabsContent value="profile">
              <Card className="rounded-panel border-border/80 bg-card shadow-soft">
                <CardHeader className="border-b border-border/70 bg-brand-muted/35">
                  <div className="flex items-center gap-3">
                    <div className="rounded-control border border-brand-highlight/20 bg-brand-muted p-3 text-brand-highlight-ink">
                      <User className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle className="font-brand-heading text-ui-section-title">기본정보</CardTitle>
                      <CardDescription>개인정보를 수정할 수 있습니다.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-8 space-y-6 md:space-y-8">
                  <div className="flex items-center gap-4 md:gap-6">
                    <Avatar className="h-24 w-24 border-2 border-border shadow-sm">
                      <AvatarImage src="/placeholder.svg?height=96&width=96" alt="프로필 이미지" />
                      <AvatarFallback className="text-ui-page-title bg-secondary text-foreground">
                        {profileData.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => showInfoToast("해당 기능은 준비 중입니다.")}
                        className="mb-2 border-border hover:bg-secondary"
                      >
                        <Camera className="mr-2 h-4 w-4" aria-hidden="true" />
                        이미지 변경
                      </Button>
                      <p className="text-ui-body-sm text-muted-foreground">
                        JPG, PNG 파일만 업로드 가능합니다
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2 text-foreground">
                        <User className="h-4 w-4" aria-hidden="true" />
                        이름 *
                      </Label>
                      <Input
                        id="name"
                        value={profileData.name ?? ""}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            name: e.target.value,
                          })
                        }
                        className="h-12 rounded-control border-border"
                        placeholder="이름을 입력해주세요"
                      />
                      {/* 소셜 가입/연동 제공자 표시 (표시용) */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-ui-label text-muted-foreground">
                        <span className="font-medium">가입/연동:</span>
                        {socialProviders.length ? (
                          <>
                            {socialProviders.includes("kakao") && (
                              <IdentityBadge tone="kakao">카카오</IdentityBadge>
                            )}
                            {socialProviders.includes("naver") && (
                              <IdentityBadge tone="naver">네이버</IdentityBadge>
                            )}
                          </>
                        ) : (
                          <span>이메일</span>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2 text-foreground">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        이메일 *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email ?? ""}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            email: e.target.value,
                          })
                        }
                        className="h-12 rounded-control border-border"
                        placeholder="example@naver.com"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="phone" className="flex items-center gap-2 text-foreground">
                        <Phone className="h-4 w-4" aria-hidden="true" />
                        전화번호
                      </Label>
                      <Input
                        id="phone"
                        value={profileData.phone ?? ""}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            phone: e.target.value,
                          })
                        }
                        className="h-12 rounded-control border-border"
                        placeholder="01012345678"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={isLoading}
                      variant="highlight"
                      className="rounded-control"
                    >
                      <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                      {isLoading ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="password">
              <Card className="rounded-panel border-border/80 bg-card shadow-soft">
                <CardHeader className="border-b border-border/70 bg-brand-muted/35">
                  <div className="flex items-center gap-3">
                    <div className="bg-secondary text-foreground rounded-2xl p-3 border border-border">
                      <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle className="font-brand-heading text-ui-section-title">비밀번호 변경</CardTitle>
                      <CardDescription>
                        보안을 위해 정기적으로 비밀번호를 변경해주세요.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-8 space-y-4 md:space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword" className="text-foreground">
                      현재 비밀번호 *
                    </Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: e.target.value,
                        })
                      }
                        className="h-12 rounded-control border-border"
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
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          newPassword: e.target.value,
                        })
                      }
                        className="h-12 rounded-control border-border"
                    />
                    <p className="text-ui-body-sm text-muted-foreground">
                      8자 이상, 영문/숫자 조합으로 입력해주세요. (특수문자는 선택)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-foreground">
                      새 비밀번호 확인 *
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: e.target.value,
                        })
                      }
                        className="h-12 rounded-control border-border"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handlePasswordChange}
                      disabled={isLoading}
                      variant="highlight"
                      className="rounded-control"
                    >
                      <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                      {isLoading ? "변경 중..." : "비밀번호 변경"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="address">
              <Card className="rounded-panel border-border/80 bg-card shadow-soft">
                <CardHeader className="border-b border-border/70 bg-brand-muted/35">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl p-3 border border-border bg-secondary text-foreground">
                      <MapPin className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <div>
                      <CardTitle className="font-brand-heading text-ui-section-title">배송지 관리</CardTitle>
                      <CardDescription>기본 배송지 정보를 관리할 수 있습니다.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 md:p-8 space-y-4 md:space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="zipCode" className="text-foreground">
                        우편번호
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="postalCode"
                          value={profileData.address.postalCode}
                          readOnly
                          className="h-12 rounded-control bg-muted text-muted-foreground cursor-default"
                          placeholder="12345"
                        />
                        <Button
                          type="button"
                          onClick={handleAddressSearch}
                          className="h-12 rounded-control px-6"
                          variant="outline"
                        >
                          검색
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address1" className="text-foreground">
                      주소
                    </Label>
                    <Input
                      id="address1"
                      value={profileData.address.address1}
                      readOnly
                      className="h-12 rounded-control bg-muted text-muted-foreground cursor-default"
                      placeholder="주소 검색 버튼을 클릭해주세요"
                    />
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
                          address: {
                            ...profileData.address,
                            address2: e.target.value,
                          },
                        })
                      }
                      className="h-12 rounded-control border-border"
                      placeholder="동, 호수 등 상세주소"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={isLoading}
                      variant="highlight"
                      className="rounded-control"
                    >
                      <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                      {isLoading ? "저장 중..." : "저장"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tennis-profile">
              <TennisProfileForm />
            </TabsContent>

            <TabsContent value="preferences">
              <div className="space-y-6 md:space-y-8">
                <Card className="rounded-panel border-border/80 bg-card shadow-soft">
                  <CardHeader className="border-b border-border/70 bg-brand-muted/35">
                    <div className="flex items-center gap-3">
                      <div className="bg-secondary text-foreground rounded-2xl p-3 border border-border">
                        <Bell className="h-6 w-6 text-primary" aria-hidden="true" />
                      </div>
                      <div>
                        <CardTitle className="font-brand-heading text-ui-section-title">마케팅 수신 동의</CardTitle>
                        <CardDescription>
                          마케팅 정보 수신 방법을 선택할 수 있습니다.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 md:p-8 space-y-4 md:space-y-6">
                    <div className="flex items-center justify-between gap-4 rounded-control bg-brand-muted/45 p-4">
                      <div>
                        <Label htmlFor="email-marketing" className="font-medium text-foreground">
                          이메일 수신
                        </Label>
                        <p className="text-ui-body-sm text-muted-foreground">
                          할인 쿠폰, 신상품 소식을 이메일로 받아보세요.
                        </p>
                      </div>
                      <Switch
                        id="email-marketing"
                        checked={profileData.marketing?.email ?? false}
                        onCheckedChange={(checked) =>
                          setProfileData({
                            ...profileData,
                            marketing: {
                              ...profileData.marketing,
                              email: checked,
                            },
                          })
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-4 rounded-control bg-brand-muted/45 p-4">
                      <div>
                        <Label htmlFor="sms-marketing" className="font-medium text-foreground">
                          SMS 수신
                        </Label>
                        <p className="text-ui-body-sm text-muted-foreground">
                          주문 상태, 배송 정보를 SMS로 받아보세요.
                        </p>
                      </div>
                      <Switch
                        id="sms-marketing"
                        checked={profileData.marketing?.sms ?? false}
                        onCheckedChange={(checked) =>
                          setProfileData({
                            ...profileData,
                            marketing: {
                              ...profileData.marketing,
                              sms: checked,
                            },
                          })
                        }
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-4 rounded-control bg-brand-muted/45 p-4">
                      <div>
                        <Label htmlFor="push-marketing" className="font-medium text-foreground">
                          앱 푸시 알림
                        </Label>
                        <p className="text-ui-body-sm text-muted-foreground">
                          앱을 통해 실시간 알림을 받아보세요.
                        </p>
                      </div>
                      <Switch
                        id="push-marketing"
                        checked={profileData.marketing?.push ?? false}
                        onCheckedChange={(checked) =>
                          setProfileData({
                            ...profileData,
                            marketing: {
                              ...profileData.marketing,
                              push: checked,
                            },
                          })
                        }
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSave}
                        disabled={isLoading}
                        variant="highlight"
                        className="rounded-control"
                      >
                        <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                        {isLoading ? "저장 중..." : "저장"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-panel border border-destructive/30 bg-card shadow-soft">
                  <CardHeader className="bg-destructive/10 dark:bg-destructive/15 border-b border-destructive/30">
                    <div className="flex items-center gap-3">
                      <div className="bg-destructive/10 dark:bg-destructive/15 text-destructive rounded-2xl p-3 border border-destructive/30">
                        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
                      </div>
                      <div>
                        <CardTitle className="text-ui-section-title text-destructive">
                          회원 탈퇴
                        </CardTitle>
                        <CardDescription>
                          계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다.
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 md:p-8">
                    {showWithdrawalForm ? (
                      <WithdrawalReasonSelect
                        onSubmit={async (reason, detail) => {
                          try {
                            const res = await fetch("/api/users/me/leave", {
                              method: "DELETE",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              credentials: "include",
                              body: JSON.stringify({
                                reason,
                                detail,
                              }),
                            });

                            if (!res.ok) {
                              const errBody = await res
                                .json()
                                .catch(() => ({ error: "알 수 없는 오류" }));
                              throw new Error(errBody.error);
                            }

                            // 탈퇴 성공 흐름
                          } catch (error: any) {
                            showErrorToast(error.message || "회원 탈퇴 중 오류가 발생했습니다.");
                          }
                        }}
                      />
                    ) : (
                      <div className="text-center">
                        <div className="bg-destructive/10 dark:bg-destructive/15 border border-destructive/30 rounded-xl p-4 md:p-6 mb-4 md:mb-6">
                          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" aria-hidden="true" />
                          <h3 className="text-ui-card-title-lg font-semibold text-destructive mb-2">
                            정말로 탈퇴하시겠습니까?
                          </h3>
                          <p className="text-ui-body-sm text-muted-foreground">
                            탈퇴 시 모든 개인정보와 이용기록이 삭제되며, 복구할 수 없습니다.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          type="button"
                          onClick={() => setShowWithdrawalForm(true)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <AlertTriangle className="mr-2 h-4 w-4" aria-hidden="true" />
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
      </SiteContainer>
    </div>
  );
}
