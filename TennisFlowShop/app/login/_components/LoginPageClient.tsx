"use client";

import SocialAuthButtons from "@/app/login/_components/SocialAuthButtons";
import { useAuthStore } from "@/app/store/authStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Mail, Shield } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type GuestOrderMode = "off" | "legacy" | "on";

function getGuestOrderModeClient(): GuestOrderMode {
  // 클라이언트 번들에서는 NEXT_PUBLIC_만 안전하게 읽을 수 있음
  // env가 없으면 "legacy"로 기본값(= 비회원 진입점 숨김) 처리해서 실수 노출을 방지.
  const raw = (process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? "legacy").trim();
  return raw === "off" || raw === "legacy" || raw === "on" ? raw : "legacy";
}

type LoginField = "email" | "password";

const RegisterTabPanel = dynamic(() => import("@/app/login/_components/RegisterTabPanel"), { loading: () => null });

// fetch 응답이 JSON이 아닐 때(res.json() 파싱 실패 등)도 화면/UX가 깨지지 않도록 안전 파싱
async function readJsonSafe(res: Response): Promise<any | null> {
  try {
    const text = await res.text().catch(() => "");
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

function safeRedirectTarget(raw?: string) {
  if (!raw) return "/";
  // 외부 URL 오픈리다이렉트 방지: 반드시 내부 경로만 허용
  if (!raw.startsWith("/")) return "/";
  // /login으로 다시 보내는 루프 방지
  if (raw.startsWith("/login")) return "/";
  return raw;
}

// 첫 오류 필드로 포커스를 이동. (id가 없으면 이동 불가하므로, 필요한 입력에는 id를 최소로 부여)
function focusFirst(ids: string[]) {
  for (const id of ids) {
    const el = document.getElementById(id) as HTMLElement | null;
    if (!el) continue;
    // HTMLElement#focus 존재 여부를 런타임에서 확인
    if (typeof (el as HTMLInputElement).focus === "function") {
      (el as HTMLInputElement).focus();
      break;
    }
  }
}

export default function LoginPageClient() {
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const [activeTab, setActiveTab] = useState<string>("login");

  // 비회원 중지
  const guestOrderMode = getGuestOrderModeClient();
  const showGuestLookup = guestOrderMode === "on";

  // 소셜 회원가입(카카오/네이버) 모드 판별
  const oauthProvider = params.get("oauth"); // 'kakao' | 'naver'
  const oauthToken = params.get("token"); // pending token
  const isSocialOauthRegister = activeTab === "register" && (oauthProvider === "kakao" || oauthProvider === "naver") && !!oauthToken;

  const { setUser } = useAuthStore();

  // 로그인 상태
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // 로그인 입력값이 “하나라도” 들어왔는지(=dirty)만 최소 추적 (uncontrolled input 유지)
  const [loginDirty, setLoginDirty] = useState(false);
  const [saveEmail, setSaveEmail] = useState(false);

  // 로그인: 필드별/공통 에러 UX
  const [loginFieldErrors, setLoginFieldErrors] = useState<Partial<Record<LoginField, string>>>({});
  const [loginFormError, setLoginFormError] = useState<string>("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const [registerDirty, setRegisterDirty] = useState(false);
  const [registerSubmitting, setRegisterSubmitting] = useState(false);
  const [registerResetSignal, setRegisterResetSignal] = useState(0);

  const isDirtyAny = loginDirty || registerDirty;
  const isSubmittingAny = loginLoading || registerSubmitting;

  // 뒤로가기/탭닫기/새로고침(popstate/beforeunload) 공통 가드
  useUnsavedChangesGuard(isDirtyAny && !isSubmittingAny);

  // 내부 이동(링크/router.push/OAuth)용 confirm
  const confirmLeaveIfDirty = () => {
    if (!isDirtyAny || isSubmittingAny) return true;
    return window.confirm(UNSAVED_CHANGES_MESSAGE);
  };

  // 탭 전환은 “현재 탭 입력이 날아가는 행동”이 될 수 있으므로 별도 confirm
  const handleTabChange = (nextTab: string) => {
    if (nextTab === activeTab) return;
    const currentDirty = activeTab === "login" ? loginDirty : registerDirty;
    if (currentDirty && !window.confirm(UNSAVED_CHANGES_MESSAGE)) return;
    // login 탭의 uncontrolled input은 탭 전환 시 언마운트로 값이 날아갈 수 있어 dirty도 내려둠
    if (activeTab === "login") setLoginDirty(false);
    setActiveTab(nextTab);
  };

  // URL 파라미터에 따라 탭 전환
  useEffect(() => {
    if (tabParam === "login" || tabParam === "register") {
      setActiveTab(tabParam);
      if (tabParam === "login") setRegisterResetSignal((prev) => prev + 1);
    }
  }, [tabParam]);

  // 탭 전환 시 이전 탭의 에러 메시지가 남아 혼동되지 않도록 초기화
  useEffect(() => {
    setLoginFieldErrors({});
    setLoginFormError("");
  }, [activeTab]);

  // 이메일 저장 로직
  useEffect(() => {
    const savedEmail = localStorage.getItem("saved-email");
    if (savedEmail) {
      const emailInput = document.getElementById("email") as HTMLInputElement | null;
      if (emailInput) emailInput.value = savedEmail;
      setSaveEmail(true);
    }
  }, []);

  const handleLogin = async () => {
    if (loginLoading) return;

    setLoginFormError("");
    setLoginFieldErrors({});

    // 로그인 폼은 기존 UI를 유지하기 위해 uncontrolled input(id 기반) 접근을 사용합니다.
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const pwInput = document.getElementById("password") as HTMLInputElement | null;

    const emailVal = (emailInput?.value ?? "").trim();
    const pwVal = pwInput?.value ?? "";

    const nextErrors: Partial<Record<LoginField, string>> = {};
    if (!emailVal) nextErrors.email = "이메일을 입력해주세요.";
    else if (!emailRegex.test(emailVal)) nextErrors.email = "유효한 이메일 형식이 아닙니다.";
    if (!pwVal) nextErrors.password = "비밀번호를 입력해주세요.";

    if (Object.keys(nextErrors).length > 0) {
      const firstMsg = nextErrors.email || nextErrors.password || "입력값을 확인해주세요.";
      setLoginFieldErrors(nextErrors);
      setLoginFormError(firstMsg);
      focusFirst([nextErrors.email ? "email" : "", nextErrors.password ? "password" : ""].filter(Boolean));
      return;
    }

    try {
      setLoginLoading(true);

      // 이메일 저장(기존 UX 유지)
      if (saveEmail) localStorage.setItem("saved-email", emailVal);
      else localStorage.removeItem("saved-email");

      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailVal, password: pwVal }),
      });

      const data = await readJsonSafe(response);

      if (!response.ok) {
        // 서버는 { error } 형태로 리턴합니다. (파싱 실패 대비)
        const msg = data?.error || data?.message || "로그인에 실패했습니다.";
        setLoginFormError(msg);
        showErrorToast(msg);
        return;
      }

      // 세션 확인(기존 흐름 유지)
      const meRes = await fetch("/api/users/me", { credentials: "include" });
      const meData = await readJsonSafe(meRes);

      const meUser = (meData as any)?.user ?? meData;

      if (!meRes.ok || !meUser?.id) {
        const msg = (meData as any)?.error || (meData as any)?.message || "로그인에 실패했습니다.";
        setLoginFormError(msg);
        showErrorToast(msg);
        return;
      }
      // 전역 로그인 상태(zustand)를 즉시 갱신해 헤더 등이 새로고침 없이 반영되게 함
      setUser(meUser);
      showSuccessToast("로그인되었습니다.");

      const redirectToRaw = params.get("next") || params.get("redirectTo") || "/";
      const redirectTo = safeRedirectTarget(redirectToRaw);

      // 로그인 페이지로 "뒤로가기" 했을 때 다시 로그인 폼이 보이지 않도록 replace가 더 안전
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      setLoginFormError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      showErrorToast("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");

      return;
    } finally {
      setLoginLoading(false);
    }
  };

  const handleKakaoOAuth = () => {
    if (!confirmLeaveIfDirty()) return;
    const from = new URLSearchParams(window.location.search).get("from");
    const url = from ? `/api/oauth/kakao?from=${encodeURIComponent(from)}` : "/api/oauth/kakao";
    window.location.href = url;
  };

  const handleNaverOAuth = () => {
    if (!confirmLeaveIfDirty()) return;
    const from = new URLSearchParams(window.location.search).get("from");
    const url = from ? `/api/oauth/naver?from=${encodeURIComponent(from)}` : "/api/oauth/naver";
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-10 left-10 w-20 h-20 bg-muted rounded-full blur-2xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-muted rounded-full blur-3xl animate-pulse"></div>

      <div className="relative w-full max-w-6xl">
        <Card className={`mx-auto overflow-hidden backdrop-blur-sm bg-card/95 dark:bg-muted border-0 shadow-2xl transition-all duration-700 ease-in-out ${activeTab === "register" ? "max-w-4xl" : "max-w-md"}`}>
          <div className="p-4 md:p-6 border-b border-primary/20 bg-primary/10 dark:bg-primary/20 text-foreground relative overflow-hidden">
            <div className="absolute inset-0 bg-foreground/10"></div>
            <div className="relative text-center">
              <div className="mx-auto mb-4 flex justify-center">
                <div className="relative h-12 w-24 shrink-0 overflow-hidden">
                  <Image src="/DokkaebiTennisString.png" alt="" aria-hidden="true" fill className="object-contain dark:hidden" priority />
                  <Image src="/DokkaebiTennisString.png" alt="" aria-hidden="true" fill className="hidden object-contain dark:block" priority />
                </div>
              </div>

              <h1 className="text-2xl bp-sm:text-3xl font-black">도깨비테니스스트링</h1>
              <p className="text-foreground mt-2 font-medium">Powered by Tennis Flow</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="login" className="data-[state=active]:bg-card dark:data-[state=active]:bg-muted data-[state=active]:shadow-md data-[state=active]:text-foreground dark:data-[state=active]:text-foreground font-semibold">
                로그인
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-card dark:data-[state=active]:bg-muted data-[state=active]:shadow-md data-[state=active]:text-foreground dark:data-[state=active]:text-foreground font-semibold">
                회원가입
              </TabsTrigger>
            </TabsList>

            {/* 로그인 탭 */}
            <TabsContent value="login" className="p-4 md:p-6">
              <div className="space-y-4 md:space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-foreground">로그인</h2>
                  <p className="text-foreground mt-2">계정에 로그인하여 쇼핑을 시작하세요</p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLogin();
                  }}
                  className="space-y-4"
                  data-cy="login-form"
                >
                  {/* {loginFormError && (
 <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/15">
 <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
 <div className="whitespace-pre-line">{loginFormError}</div>
 </div>
 )} */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground font-medium">
                      이메일
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-foreground" />
                      <Input
                        id="email"
                        data-cy="login-email"
                        type="email"
                        placeholder="이메일 주소를 입력하세요"
                        onChange={(e) => {
                          setLoginFieldErrors((prev) => ({
                            ...prev,
                            email: undefined,
                          }));
                          setLoginFormError("");
                          const pwVal = (document.getElementById("password") as HTMLInputElement | null)?.value ?? "";
                          setLoginDirty(!!e.currentTarget.value.trim() || !!pwVal);
                        }}
                        className="pl-10 h-12 border-border focus:border-border focus:ring-ring dark:focus:border-border"
                      />
                    </div>
                    {loginFieldErrors.email && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="whitespace-pre-line">{loginFieldErrors.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-foreground font-medium">
                      비밀번호
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-foreground" />
                      <Input
                        id="password"
                        data-cy="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호를 입력하세요"
                        onChange={(e) => {
                          setLoginFieldErrors((prev) => ({
                            ...prev,
                            password: undefined,
                          }));
                          setLoginFormError("");
                          const emailVal = (document.getElementById("email") as HTMLInputElement | null)?.value ?? "";
                          setLoginDirty(!!emailVal.trim() || !!e.currentTarget.value);
                        }}
                        className="pl-10 pr-10 h-12 border-border focus:border-border focus:ring-ring dark:focus:border-border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-foreground hover:text-foreground dark:hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {loginFieldErrors.password && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="whitespace-pre-line">{loginFieldErrors.password}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <input type="checkbox" checked={saveEmail} onChange={(e) => setSaveEmail(e.target.checked)} className="rounded border-border text-foreground focus:ring-ring" />
                      이메일 저장
                    </label>
                    <Link
                      href="/forgot-password"
                      onClick={(e) => {
                        if (!confirmLeaveIfDirty()) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      className="text-sm text-foreground hover:text-foreground dark:hover:text-foreground hover:underline"
                    >
                      비밀번호 찾기
                    </Link>
                  </div>

                  <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300" disabled={loginLoading} data-cy="login-submit">
                    {loginLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        로그인 중...
                      </>
                    ) : (
                      "로그인"
                    )}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card dark:bg-muted px-4 text-foreground font-medium">SNS 계정으로 로그인</span>
                  </div>
                </div>

                <SocialAuthButtons onKakaoClick={handleKakaoOAuth} onNaverClick={handleNaverOAuth} />

                {showGuestLookup && (
                  <div className="text-center">
                    <div className="bg-muted rounded-xl p-4 mb-4 border border-border">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Shield className="h-5 w-5 text-foreground" />
                        <p className="text-sm font-semibold text-foreground">비회원도 주문하실 수 있습니다</p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full border-border text-foreground hover:bg-muted dark:hover:bg-muted bg-transparent"
                        onClick={() => {
                          if (!confirmLeaveIfDirty()) return;
                          router.push("/order-lookup");
                        }}
                      >
                        비회원 주문 조회하기
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <RegisterTabPanel
              isSocialOauthRegister={isSocialOauthRegister}
              oauthProvider={oauthProvider}
              oauthToken={oauthToken}
              onKakaoOAuth={handleKakaoOAuth}
              onNaverOAuth={handleNaverOAuth}
              onSwitchToLoginTab={() => setActiveTab("login")}
              onRegisterDirtyChange={setRegisterDirty}
              onRegisterSubmittingChange={setRegisterSubmitting}
              resetSignal={registerResetSignal}
            />
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
