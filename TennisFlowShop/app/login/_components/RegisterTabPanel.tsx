"use client";

import SocialAuthButtons from "@/app/login/_components/SocialAuthButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { getReservedDisplayNameErrorMessage } from "@/lib/reserved-display-name";
import { getReservedEmailLocalPartErrorMessage } from "@/lib/reserved-email-localpart";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { AlertCircle, CheckCircle, Eye, EyeOff, Loader2, Lock, Mail, MapPin, Phone, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

let daumPostcodeScriptPromise: Promise<void> | null = null;

const PASSWORD_POLICY_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
const POSTAL_RE = /^\d{5}$/;
const onlyDigits = (v: string) => String(v ?? "").replace(/\D/g, "");
const formatKoreanPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (!d) return "";
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
};

const isValidKoreanPhone = (v: string) => /^010\d{8}$/.test(onlyDigits(v));

type RegisterField = "emailId" | "emailDomain" | "password" | "confirmPassword" | "name" | "phone" | "postalCode" | "address" | "addressDetail";

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

function focusFirst(ids: string[]) {
  for (const id of ids) {
    const el = document.getElementById(id) as HTMLElement | null;
    if (!el) continue;
    if (typeof (el as HTMLInputElement).focus === "function") {
      (el as HTMLInputElement).focus();
      break;
    }
  }
}

type RegisterTabPanelProps = {
  isSocialOauthRegister: boolean;
  oauthProvider: string | null;
  oauthToken: string | null;
  onKakaoOAuth: () => void;
  onNaverOAuth: () => void;
  onSwitchToLoginTab: () => void;
  onRegisterDirtyChange: (dirty: boolean) => void;
  onRegisterSubmittingChange: (submitting: boolean) => void;
  resetSignal: number;
};

export default function RegisterTabPanel({ isSocialOauthRegister, oauthProvider, oauthToken, onKakaoOAuth, onNaverOAuth, onSwitchToLoginTab, onRegisterDirtyChange, onRegisterSubmittingChange, resetSignal }: RegisterTabPanelProps) {
  const router = useRouter();
  const params = useSearchParams();

  const [emailId, setEmailId] = useState("");
  const [emailDomain, setEmailDomain] = useState("gmail.com");
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [isEmailAvailable, setIsEmailAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");

  const [registerFieldErrors, setRegisterFieldErrors] = useState<Partial<Record<RegisterField, string>>>({});
  const [registerFormError, setRegisterFormError] = useState<string>("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailIdRegex = /^[a-z0-9]{4,30}$/;

  const resetRegisterForm = () => {
    setEmailId("");
    setEmailDomain("gmail.com");
    setIsCustomDomain(false);
    setIsEmailAvailable(null);
    setCheckingEmail(false);
    setPassword("");
    setConfirmPassword("");
    setShowRegisterPassword(false);
    setShowConfirmPassword(false);
    setName("");
    setPhone("");
    setPostalCode("");
    setAddress("");
    setAddressDetail("");
    setRegisterFieldErrors({});
    setRegisterFormError("");
  };

  useEffect(() => {
    if (resetSignal > 0) resetRegisterForm();
  }, [resetSignal]);

  const registerDirty = useMemo(() => {
    return (
      emailId.trim() !== "" ||
      emailDomain.trim() !== "gmail.com" ||
      isCustomDomain ||
      password !== "" ||
      confirmPassword !== "" ||
      name.trim() !== "" ||
      phone.trim() !== "" ||
      postalCode.trim() !== "" ||
      address.trim() !== "" ||
      addressDetail.trim() !== ""
    );
  }, [emailId, emailDomain, isCustomDomain, password, confirmPassword, name, phone, postalCode, address, addressDetail]);

  useEffect(() => {
    onRegisterDirtyChange(registerDirty);
  }, [onRegisterDirtyChange, registerDirty]);

  useEffect(() => {
    onRegisterSubmittingChange(submitting);
  }, [onRegisterSubmittingChange, submitting]);

  useEffect(() => {
    if (!isSocialOauthRegister) return;
    setIsEmailAvailable(null);

    (async () => {
      try {
        const res = await fetch(`/api/oauth/pending?token=${encodeURIComponent(oauthToken!)}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await readJsonSafe(res);

        if (!res.ok || !data?.email) {
          showErrorToast("소셜 회원가입 정보가 만료되었어요. 다시 시도해주세요.");
          router.push("/login?tab=login");
          return;
        }

        const fullEmail = String(data.email);
        const [idPart, domainPart] = fullEmail.split("@");

        setEmailId(idPart ?? "");
        setEmailDomain(domainPart ?? "gmail.com");
        setIsCustomDomain(true);
        setName(String(data.name ?? idPart ?? ""));
        setIsEmailAvailable(null);
      } catch (e) {
        showErrorToast("소셜 회원가입 정보를 불러오지 못했습니다.");
        router.push("/login?tab=login");
      }
    })();
  }, [isSocialOauthRegister, oauthToken, router]);

  const checkEmailAvailability = async () => {
    if (checkingEmail || isSocialOauthRegister) return;

    setRegisterFormError("");
    setRegisterFieldErrors((prev) => ({
      ...prev,
      emailId: undefined,
      emailDomain: undefined,
    }));
    setIsEmailAvailable(null);

    const idTrim = emailId.trim();
    const domainTrim = emailDomain.trim();
    const emailVal = `${idTrim}@${domainTrim}`;

    if (!idTrim || !domainTrim) {
      const msg = "이메일을 입력해주세요.";
      setRegisterFormError(msg);
      setRegisterFieldErrors((prev) => ({
        ...prev,
        emailId: !idTrim ? "이메일 아이디를 입력해주세요." : undefined,
        emailDomain: !domainTrim ? "이메일 도메인을 선택/입력해주세요." : undefined,
      }));
      focusFirst([!idTrim ? "register-email-id" : "", !domainTrim ? "register-email-domain" : ""].filter(Boolean));
      return;
    }

    if (!emailIdRegex.test(idTrim)) {
      const msg = "아이디는 영문 소문자와 숫자 조합으로 4자 이상 입력해주세요.";
      setRegisterFormError(msg);
      setRegisterFieldErrors((prev) => ({ ...prev, emailId: msg }));
      focusFirst(["register-email-id"]);
      return;
    }

    if (!emailRegex.test(emailVal)) {
      const msg = "유효한 이메일 형식이 아닙니다.";
      setRegisterFormError(msg);
      setRegisterFieldErrors((prev) => ({ ...prev, emailDomain: msg }));
      focusFirst(["register-email-domain"]);
      return;
    }

    const reservedEmailError = getReservedEmailLocalPartErrorMessage(emailVal);
    if (reservedEmailError) {
      setRegisterFormError(reservedEmailError);
      setRegisterFieldErrors((prev) => ({
        ...prev,
        emailId: reservedEmailError,
      }));
      setIsEmailAvailable(null);
      focusFirst(["register-email-id"]);
      return;
    }

    try {
      setCheckingEmail(true);
      const res = await fetch(`/api/check-email?email=${encodeURIComponent(emailVal)}`, { credentials: "include" });
      const data = await readJsonSafe(res);

      if (!res.ok) {
        const msg = data?.error || data?.message || "중복 확인에 실패했습니다.";
        setRegisterFormError(msg);
        return;
      }

      const available = !!data?.isAvailable;
      setIsEmailAvailable(available);
    } catch (err) {
      setRegisterFormError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      return;
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setRegisterFormError("");
    setRegisterFieldErrors({});

    const nameTrim = name.trim();
    const phoneDigits = onlyDigits(phone);
    const postalTrim = postalCode.trim();
    const addressTrim = address.trim();

    const nextCommonErrors: Partial<Record<RegisterField, string>> = {};
    if (!nameTrim || nameTrim.length < 2) nextCommonErrors.name = "이름을 입력해주세요. (2자 이상)";
    else {
      const reservedNameError = getReservedDisplayNameErrorMessage(nameTrim);
      if (reservedNameError) nextCommonErrors.name = reservedNameError;
    }
    if (!phoneDigits) nextCommonErrors.phone = "연락처를 입력해주세요. (예: 01012345678)";
    else if (!isValidKoreanPhone(phoneDigits)) nextCommonErrors.phone = "올바른 연락처 형식으로 입력해주세요. (010 0000 0000)";
    if (!postalTrim || !addressTrim) nextCommonErrors.postalCode = "우편번호 찾기를 통해 주소를 등록해주세요.";
    else if (!POSTAL_RE.test(postalTrim)) nextCommonErrors.postalCode = "우편번호 형식이 올바르지 않습니다.";
    if (!addressTrim) nextCommonErrors.address = "우편번호 찾기를 통해 주소를 등록해주세요.";

    if (isSocialOauthRegister) {
      if (Object.keys(nextCommonErrors).length > 0) {
        const firstMsg = nextCommonErrors.name || nextCommonErrors.phone || nextCommonErrors.postalCode || nextCommonErrors.address || "입력값을 확인해주세요.";
        setRegisterFieldErrors(nextCommonErrors);
        setRegisterFormError(firstMsg);
        focusFirst([nextCommonErrors.name ? "register-name" : "", nextCommonErrors.phone ? "register-phone" : "", nextCommonErrors.postalCode || nextCommonErrors.address ? "register-find-postcode" : ""].filter(Boolean));
        return;
      }

      try {
        setSubmitting(true);
        const res = await fetch("/api/oauth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            token: oauthToken,
            name: nameTrim,
            phone: phoneDigits,
            postalCode: postalTrim,
            address: addressTrim,
            addressDetail,
          }),
        });

        const data = await readJsonSafe(res);

        if (!res.ok) {
          const msg = data?.error || data?.message || "회원가입에 실패했습니다.";
          setRegisterFormError(msg);
          return;
        }

        showSuccessToast("회원가입이 완료되었습니다.");
        resetRegisterForm();
        router.replace(data?.redirectTo || "/");
        router.refresh();
      } catch (err) {
        setRegisterFormError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        return;
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const nextErrors: Partial<Record<RegisterField, string>> = {
      ...nextCommonErrors,
    };

    const idTrim = emailId.trim();
    const domainTrim = emailDomain.trim();
    const emailVal = `${idTrim}@${domainTrim}`;

    if (!idTrim || !domainTrim) nextErrors.emailId = "이메일을 입력해주세요.";
    else if (!emailIdRegex.test(idTrim)) nextErrors.emailId = "아이디는 영문 소문자와 숫자 조합으로 4자 이상 입력해주세요.";
    else if (!emailRegex.test(emailVal)) nextErrors.emailId = "유효한 이메일 형식이 아닙니다.";
    else {
      const reservedEmailError = getReservedEmailLocalPartErrorMessage(emailVal);
      if (reservedEmailError) nextErrors.emailId = reservedEmailError;
      else if (isEmailAvailable !== true) nextErrors.emailId = "이메일 중복 확인을 진행해주세요.";
    }

    if (!password) nextErrors.password = "비밀번호를 입력해주세요.";
    else if (!PASSWORD_POLICY_RE.test(password)) nextErrors.password = "비밀번호는 8자 이상이며 영문/숫자를 포함해야 합니다.";

    if (!confirmPassword) nextErrors.confirmPassword = "비밀번호 확인을 입력해주세요.";
    else if (password !== confirmPassword) nextErrors.confirmPassword = "비밀번호가 일치하지 않습니다.";

    if (Object.keys(nextErrors).length > 0) {
      const firstMsg = nextErrors.emailId || nextErrors.password || nextErrors.confirmPassword || nextErrors.name || nextErrors.phone || nextErrors.postalCode || nextErrors.address || "입력값을 확인해주세요.";
      setRegisterFieldErrors(nextErrors);
      setRegisterFormError(firstMsg);

      focusFirst(
        [
          nextErrors.emailId ? "register-email-id" : "",
          nextErrors.emailDomain ? "register-email-domain" : "",
          nextErrors.password ? "register-password" : "",
          nextErrors.confirmPassword ? "register-confirm-password" : "",
          nextErrors.name ? "register-name" : "",
          nextErrors.phone ? "register-phone" : "",
          nextErrors.postalCode || nextErrors.address ? "register-find-postcode" : "",
        ].filter(Boolean),
      );
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailVal,
          password,
          name: nameTrim,
          phone: phoneDigits,
          postalCode: postalTrim,
          address: addressTrim,
          addressDetail,
        }),
      });

      const data = await readJsonSafe(response);

      if (!response.ok) {
        const msg = data?.error || data?.message || "회원가입에 실패했습니다.";
        setRegisterFormError(msg);

        if (typeof msg === "string" && msg.includes("이미")) {
          setIsEmailAvailable(false);
        }
        return;
      }

      showSuccessToast("회원가입이 완료되었습니다. 로그인 탭으로 이동합니다.");
      resetRegisterForm();
      onSwitchToLoginTab();

      const q = new URLSearchParams(params.toString());
      q.set("tab", "login");
      router.replace(`/login?${q.toString()}`);
    } catch (err) {
      setRegisterFormError("네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      return;
    } finally {
      setSubmitting(false);
    }
  };

  const handleFindPostcode = async () => {
    try {
      if (typeof window === "undefined") return;

      if (!window.daum?.Postcode) {
        if (!daumPostcodeScriptPromise) {
          daumPostcodeScriptPromise = new Promise<void>((resolve, reject) => {
            const existing = document.querySelector<HTMLScriptElement>('script[src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"]');

            if (existing) {
              existing.addEventListener("load", () => resolve(), {
                once: true,
              });
              existing.addEventListener("error", () => reject(new Error("Failed to load Daum postcode script")), { once: true });
              return;
            }

            const script = document.createElement("script");
            script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Daum postcode script"));
            document.body.appendChild(script);
          }).catch((error) => {
            daumPostcodeScriptPromise = null;
            throw error;
          });
        }

        await daumPostcodeScriptPromise;
      }

      if (!window.daum?.Postcode) return;

      new window.daum.Postcode({
        oncomplete: (data: any) => {
          const fullAddress = data.address;
          const zonecode = data.zonecode;
          setPostalCode(zonecode);
          setAddress(fullAddress);
          setRegisterFieldErrors((prev) => ({
            ...prev,
            postalCode: undefined,
            address: undefined,
          }));
          setRegisterFormError("");
        },
      }).open();
    } catch {
      return;
    }
  };

  return (
    <TabsContent value="register" className="p-4 md:p-6">
      <div className="space-y-4 md:space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">회원가입</h2>
          <p className="text-foreground mt-2">도깨비테니스스트링의 회원이 되어보세요</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 bp-lg:grid-cols-2 gap-4 md:gap-6">
            <div className="bp-lg:col-span-2 space-y-2">
              <Label htmlFor="register-email-id" className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Mail className="h-4 w-4 text-foreground" />
                이메일 주소
              </Label>

              <div className="space-y-2">
                <div className="flex flex-col gap-2 bp-sm:flex-row bp-sm:items-start">
                  <div className="flex w-full items-center gap-2 min-w-0">
                    <div className="relative flex-1 min-w-0">
                      <Input
                        id="register-email-id"
                        value={emailId}
                        onChange={(e) => {
                          setEmailId(e.target.value);
                          setIsEmailAvailable(null);
                          setRegisterFieldErrors((prev) => ({
                            ...prev,
                            emailId: undefined,
                          }));
                        }}
                        placeholder="아이디 입력"
                        className={`h-12 pl-10 pr-4 ${registerFieldErrors.emailId ? "border-destructive focus:border-destructive" : ""}`}
                        autoComplete="email"
                        disabled={isSocialOauthRegister}
                      />
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>

                    <span className="text-muted-foreground">@</span>

                    {isCustomDomain ? (
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        <Input
                          id="register-email-domain"
                          value={emailDomain}
                          onChange={(e) => {
                            setEmailDomain(e.target.value);
                            setIsEmailAvailable(null);
                            setRegisterFieldErrors((prev) => ({
                              ...prev,
                              emailDomain: undefined,
                            }));
                          }}
                          placeholder="도메인 직접 입력"
                          className={`h-12 ${registerFieldErrors.emailDomain ? "border-destructive focus:border-destructive" : ""}`}
                          disabled={isSocialOauthRegister}
                        />
                        {!isSocialOauthRegister && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-12 shrink-0"
                            onClick={() => {
                              setIsCustomDomain(false);
                              setEmailDomain("gmail.com");
                              setIsEmailAvailable(null);
                            }}
                          >
                            선택
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-1 min-w-0">
                        <Select
                          value={emailDomain}
                          onValueChange={(v) => {
                            setEmailDomain(v);
                            setIsEmailAvailable(null);
                            setRegisterFieldErrors((prev) => ({
                              ...prev,
                              emailDomain: undefined,
                            }));
                            if (v === "custom") {
                              setIsCustomDomain(true);
                              setEmailDomain("");
                            } else {
                              setIsCustomDomain(false);
                            }
                          }}
                          disabled={isSocialOauthRegister}
                        >
                          <SelectTrigger id="register-email-domain" className={`h-12 ${registerFieldErrors.emailDomain ? "border-destructive focus:border-destructive" : ""}`}>
                            <SelectValue placeholder="도메인 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gmail.com">gmail.com</SelectItem>
                            <SelectItem value="naver.com">naver.com</SelectItem>
                            <SelectItem value="daum.net">daum.net</SelectItem>
                            <SelectItem value="kakao.com">kakao.com</SelectItem>
                            <SelectItem value="custom">직접 입력</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {!isSocialOauthRegister && (
                    <Button type="button" variant="outline" className="h-12 px-4 shrink-0" onClick={checkEmailAvailability} disabled={!emailRegex.test(`${emailId.trim()}@${emailDomain.trim()}`) || checkingEmail}>
                      {checkingEmail ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          확인 중
                        </span>
                      ) : (
                        "중복 확인"
                      )}
                    </Button>
                  )}
                </div>

                {(registerFieldErrors.emailId || registerFieldErrors.emailDomain) && (
                  <div className="space-y-1">
                    {registerFieldErrors.emailId && (
                      <p className="flex items-center gap-1 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {registerFieldErrors.emailId}
                      </p>
                    )}
                    {registerFieldErrors.emailDomain && (
                      <p className="flex items-center gap-1 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {registerFieldErrors.emailDomain}
                      </p>
                    )}
                  </div>
                )}

                {isSocialOauthRegister && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle className="h-4 w-4" />
                    소셜 로그인 이메일이 자동으로 입력되었습니다.
                  </div>
                )}

                {!isSocialOauthRegister && isEmailAvailable !== null && (
                  <div className={`flex items-center gap-2 text-sm ${isEmailAvailable ? "text-foreground" : "text-destructive"}`}>
                    {isEmailAvailable ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                    {isEmailAvailable ? "사용 가능한 이메일입니다." : "이미 사용 중인 이메일입니다."}
                  </div>
                )}
              </div>
            </div>
            {!isSocialOauthRegister && (
              <>
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">비밀번호</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-foreground" />
                    <Input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setRegisterFieldErrors((prev) => ({
                          ...prev,
                          password: undefined,
                        }));
                        setRegisterFormError("");
                      }}
                      placeholder="비밀번호를 입력하세요"
                      className="pl-10 pr-10 h-12 border-border focus:border-border dark:focus:border-border"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-foreground" onClick={() => setShowRegisterPassword(!showRegisterPassword)}>
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {registerFieldErrors.password && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="whitespace-pre-line">{registerFieldErrors.password}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground font-medium">비밀번호 확인</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-foreground" />
                    <Input
                      id="register-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setRegisterFieldErrors((prev) => ({
                          ...prev,
                          confirmPassword: undefined,
                        }));
                        setRegisterFormError("");
                      }}
                      placeholder="비밀번호를 다시 입력하세요"
                      className="pl-10 pr-10 h-12 border-border focus:border-border dark:focus:border-border"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 text-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {password && confirmPassword && password !== confirmPassword && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      비밀번호가 일치하지 않습니다.
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label className="text-foreground font-medium">이름</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-foreground" />
                <Input
                  id="register-name"
                  value={name}
                  onChange={(e) => {
                    const nextName = e.target.value;
                    setName(nextName);
                    const reservedNameError = getReservedDisplayNameErrorMessage(nextName.trim());
                    setRegisterFieldErrors((prev) => ({
                      ...prev,
                      name: reservedNameError ?? undefined,
                    }));
                    setRegisterFormError(reservedNameError ?? "");
                  }}
                  placeholder="이름을 입력하세요"
                  className="pl-10 h-12 border-border focus:border-border dark:focus:border-border"
                />
              </div>
              {registerFieldErrors.name && (
                <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="whitespace-pre-line">{registerFieldErrors.name}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground font-medium">연락처</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-foreground" />
                <Input
                  id="register-phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatKoreanPhone(e.target.value));
                    setRegisterFieldErrors((prev) => ({
                      ...prev,
                      phone: undefined,
                    }));
                    setRegisterFormError("");
                  }}
                  placeholder="연락처를 입력하세요 ('-' 제외)"
                  inputMode="numeric"
                  maxLength={13}
                  className="pl-10 h-12 border-border focus:border-border dark:focus:border-border"
                />
              </div>
              {registerFieldErrors.phone && (
                <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="whitespace-pre-line">{registerFieldErrors.phone}</span>
                </div>
              )}
            </div>

            <div className="bp-lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-medium">우편번호</Label>
                <Button id="register-find-postcode" type="button" variant="outline" size="sm" className="border-border text-foreground hover:bg-muted dark:hover:bg-muted bg-transparent" onClick={handleFindPostcode}>
                  <MapPin className="mr-2 h-4 w-4" />
                  우편번호 찾기
                </Button>
              </div>
              <Input id="register-postal-code" value={postalCode} placeholder="우편번호를 입력하세요" readOnly className="bg-muted cursor-not-allowed max-w-xs h-12 border-border" />
              {registerFieldErrors.postalCode && (
                <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="whitespace-pre-line">{registerFieldErrors.postalCode}</span>
                </div>
              )}
            </div>

            <div className="bp-lg:col-span-2 space-y-2">
              <Label className="text-foreground font-medium">기본 배송지 주소</Label>
              <Input id="register-address" value={address} placeholder="기본 주소를 입력하세요" readOnly className="bg-muted cursor-not-allowed h-12 border-border" />
              {registerFieldErrors.address && (
                <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span className="whitespace-pre-line">{registerFieldErrors.address}</span>
                </div>
              )}
            </div>

            <div className="bp-lg:col-span-2 space-y-2">
              <Label className="text-foreground font-medium">상세 주소</Label>
              <Input
                id="register-address-detail"
                value={addressDetail}
                onChange={(e) => {
                  setAddressDetail(e.target.value);
                  setRegisterFieldErrors((prev) => ({
                    ...prev,
                    addressDetail: undefined,
                  }));
                  setRegisterFormError("");
                }}
                placeholder="상세 주소를 입력하세요"
                className="h-12 border-border focus:border-border dark:focus:border-border"
              />
            </div>
          </div>
          {registerFieldErrors.addressDetail && (
            <div className="mt-2 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="whitespace-pre-line">{registerFieldErrors.addressDetail}</span>
            </div>
          )}

          <Button
            type="submit"
            className={
              isSocialOauthRegister
                ? oauthProvider === "naver"
                  ? "w-full h-12 bg-card border border-border text-foreground hover:bg-muted dark:hover:bg-muted hover:border-success/40 font-semibold shadow-lg"
                  : "w-full h-12 bg-card border border-border text-foreground hover:bg-muted dark:hover:bg-muted hover:border-warning/40 font-semibold shadow-lg"
                : "w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
            }
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                가입 중...
              </>
            ) : isSocialOauthRegister ? (
              <>
                {oauthProvider === "naver" ? (
                  <>
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.344 12.9 8.72 2H4v20h3.656V11.1L15.28 22H20V2h-3.656v10.9Z" />
                    </svg>
                    네이버로 회원가입 완료
                  </>
                ) : (
                  <>
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.477 3 2 6.58 2 11c0 2.783 1.77 5.243 4.5 6.66L5.6 21.5c-.1.4.3.7.7.5l4.3-2.3c.45.06.91.09 1.4.09 5.523 0 10-3.58 10-8s-4.477-8-10-8z" />
                    </svg>
                    카카오로 회원가입 완료
                  </>
                )}
              </>
            ) : (
              "회원가입"
            )}
          </Button>
          {!isSocialOauthRegister && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card dark:bg-muted px-4 text-foreground font-medium">SNS 계정으로 가입</span>
                </div>
              </div>
              <SocialAuthButtons onKakaoClick={onKakaoOAuth} onNaverClick={onNaverOAuth} isRegisterMode={true} />
            </>
          )}
        </form>
      </div>
    </TabsContent>
  );
}
