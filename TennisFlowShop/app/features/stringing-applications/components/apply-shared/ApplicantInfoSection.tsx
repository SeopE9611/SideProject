"use client";

import type React from "react";

import { User, Truck, Store, Shield, MapPin, Box } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { normalizeCollection } from "@/app/features/stringing-applications/lib/collection";
import { collectionVisitNotice } from "@/app/features/stringing-applications/lib/fulfillment-labels";
import { useEffect, useMemo, useRef, useState } from "react";

type CollectionMethod = "self_ship" | "courier_pickup" | "visit";

export type ApplicantInfoSectionProps = {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleInputChange: (e: any) => void;
  handleOpenPostcode: () => void;

  orderId: string | null;
  isMember: boolean;
  isVisitDelivery: boolean;
  lockCollection: boolean;

  applicationId: string | null;
  isUserLoading: boolean;
};

// 입력 검증 보조 (Step1 자체에서 인라인 에러를 표시하기 위함)
const onlyDigits = (v: string) => v.replace(/\D/g, "");

// 010 0000 0000 형태로 점진 포맷 (공백 포함). 서버 전송은 normalizePhone에서 숫자만 쓰므로 안전.
const format010Phone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (!d) return "";
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)}`;
};

const isValid010Phone = (v: string) => /^010\d{8}$/.test(onlyDigits(v));

export default function ApplicantInfoSection({
  formData,
  setFormData,
  handleInputChange,
  handleOpenPostcode,
  orderId,
  isMember,
  isVisitDelivery,
  lockCollection,
  applicationId,
  isUserLoading,
}: ApplicantInfoSectionProps) {
  const shippingAddressSnapshotRef = useRef<{
    shippingPostcode: string;
    shippingAddress: string;
    shippingAddressDetail: string;
  }>({
    shippingPostcode: "",
    shippingAddress: "",
    shippingAddressDetail: "",
  });

  // Step1에서 제출 전 기본 검증 + 인라인 에러를 제공하기 위한 상태
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (key: string) =>
    setTouched((prev) => ({ ...prev, [key]: true }));

  const fieldErrors = useMemo(() => {
    const next: Record<string, string> = {};

    const nameTrim = String(formData?.name || "").trim();
    const emailTrim = String(formData?.email || "").trim();
    const phoneVal = String(formData?.phone || "");
    const postcodeTrim = String(formData?.shippingPostcode || "").trim();
    const addrTrim = String(formData?.shippingAddress || "").trim();
    const method = formData?.collectionMethod as CollectionMethod | undefined;
    const isVisitCollection = normalizeCollection(method) === "visit";

    if (!nameTrim) next.name = "이름을 입력해주세요.";
    if (!emailTrim) next.email = "이메일을 입력해주세요.";
    if (!phoneVal.trim()) next.phone = "연락처를 입력해주세요.";
    else if (!isValid010Phone(phoneVal))
      next.phone = "올바른 연락처 형식으로 입력해주세요. (01012345678)";

    // 방문 접수는 주소 입력이 비필수, 그 외 방식은 주소를 필수로 유지
    if (!isVisitCollection) {
      if (!postcodeTrim)
        next.shippingPostcode = "우편번호 찾기를 통해 주소를 등록해주세요.";
      if (!addrTrim)
        next.shippingAddress = "우편번호 찾기를 통해 주소를 등록해주세요.";
    }

    if (!method) next.collectionMethod = "수거 방식을 선택해주세요.";
    if (method === "courier_pickup") {
      if (!formData?.pickupDate)
        next.pickupDate = "수거 희망일을 입력해주세요.";
      if (!formData?.pickupTime)
        next.pickupTime = "수거 시간대를 입력해주세요.";
    }

    return next;
  }, [formData]);

  const firstErrorMessage = useMemo(() => {
    const keys = Object.keys(fieldErrors);
    for (const k of keys) {
      if (touched[k]) return fieldErrors[k];
    }
    return "";
  }, [fieldErrors, touched]);

  // 방문 수령(주문 기반)일 땐 방문 접수 외 선택을 막는 용도
  const lockVisit = lockCollection || isVisitDelivery;
  const isVisitSelected =
    normalizeCollection(formData.collectionMethod) === "visit";
  const courierPickupDisabled = true; // false로 변경하면 기사방문 선택가능

  // 정상 프리필되면 잠그고 비어있는경우 풀림
  const isPrefillLocked = !!(orderId || isMember);
  const hasPrefilledAddress = Boolean(
    formData.shippingPostcode?.trim() && formData.shippingAddress?.trim(),
  );
  const lockAddressFields = isPrefillLocked && hasPrefilledAddress;

  // 우편번호/주소는 "검색으로 자동입력"되는 영역이므로 항상 직접 입력을 막는다.
  // - 값 세팅은 handleOpenPostcode 내부에서 setFormData로만 들어오게 유지
  const lockAutoAddressInputs = true;
  const postcodeAddressReadOnly = lockAutoAddressInputs || lockAddressFields;
  const canOpenPostcodeSearch = !lockCollection && !lockAddressFields;

  // visit 전환 이전의 주소를 보존해두고, 다시 비-visit으로 돌아오면 복원 가능하게 유지
  useEffect(() => {
    if (isVisitSelected) return;

    const postcode = String(formData?.shippingPostcode || "");
    const address = String(formData?.shippingAddress || "");
    const addressDetail = String(formData?.shippingAddressDetail || "");

    if (!postcode.trim() && !address.trim() && !addressDetail.trim()) return;

    shippingAddressSnapshotRef.current = {
      shippingPostcode: postcode,
      shippingAddress: address,
      shippingAddressDetail: addressDetail,
    };
  }, [
    isVisitSelected,
    formData?.shippingPostcode,
    formData?.shippingAddress,
    formData?.shippingAddressDetail,
  ]);

  // 에러 텍스트는 "있을 때만" 렌더 (불필요한 상시 여백 제거)
  const errorText = (key: string) =>
    touched[key] && fieldErrors[key] ? fieldErrors[key] : "";
  const errCls = "mt-1 px-3 text-[11px] leading-tight text-destructive";

  return (
    <div className="relative space-y-5">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4 dark:bg-primary/20">
          <User className="h-8 w-8 text-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-2">신청자 정보</h2>
        <p className="text-muted-foreground">정확한 정보를 입력해주세요</p>
      </div>

      {/* 기본 정보: 2열 */}
      <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-sm font-medium">
            신청인 이름 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            onBlur={() => markTouched("name")}
            readOnly={!!(orderId || isMember)}
            className={`transition-all duration-200 ${orderId || isMember ? "bg-muted text-muted-foreground cursor-not-allowed" : "focus:ring-2 focus:ring-ring"}`}
            placeholder="이름을 입력해주세요"
          />
          {errorText("name") ? (
            <p className={errCls}>{errorText("name")}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="email" className="text-sm font-medium">
            이메일 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            onBlur={() => markTouched("email")}
            readOnly={!!(orderId || isMember)}
            className={`transition-all duration-200 ${orderId || isMember ? "bg-muted text-muted-foreground cursor-not-allowed" : "focus:ring-2 focus:ring-ring"}`}
            placeholder="이메일을 입력해주세요"
          />
          {errorText("email") ? (
            <p className={errCls}>{errorText("email")}</p>
          ) : null}
        </div>

        <div className="md:col-span-2 space-y-1">
          <Label htmlFor="phone" className="text-sm font-medium">
            연락처 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={(e) => {
              const v = format010Phone(e.target.value);
              setFormData((prev: any) => ({
                ...prev,
                phone: v,
                shippingPhone: v,
              }));
            }}
            onBlur={() => markTouched("phone")}
            readOnly={!!(orderId || isMember)}
            className={`transition-all duration-200 ${orderId || isMember ? "bg-muted text-muted-foreground cursor-not-allowed" : "focus:ring-2 focus:ring-ring"}`}
            placeholder="01012345678"
          />
          {errorText("phone") ? (
            <p className={errCls}>{errorText("phone")}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {isVisitSelected ? (
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            {collectionVisitNotice}
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor="shippingPostcode" className="text-sm font-medium">
                우편번호 <span className="text-destructive">*</span>
              </Label>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  id="shippingPostcode"
                  name="shippingPostcode"
                  value={formData.shippingPostcode}
                  onBlur={() => markTouched("shippingPostcode")}
                  readOnly={postcodeAddressReadOnly}
                  className={`w-full md:w-[180px] transition-all duration-200 ${postcodeAddressReadOnly ? "bg-muted text-muted-foreground cursor-not-allowed" : "focus:ring-2 focus:ring-ring"}`}
                  placeholder=""
                />
                {canOpenPostcodeSearch && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenPostcode}
                    className="h-10 whitespace-nowrap transition-colors duration-200"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    우편번호 검색
                  </Button>
                )}
              </div>
              {errorText("shippingPostcode") ? (
                <p className={errCls}>{errorText("shippingPostcode")}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="shippingAddress" className="text-sm font-medium">
                주소 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="shippingAddress"
                name="shippingAddress"
                value={formData.shippingAddress}
                onBlur={() => markTouched("shippingAddress")}
                readOnly={postcodeAddressReadOnly}
                className={`transition-all duration-200 ${postcodeAddressReadOnly ? "bg-muted text-muted-foreground cursor-not-allowed" : "focus:ring-2 focus:ring-ring"}`}
                placeholder=""
              />
              {errorText("shippingAddress") ? (
                <p className={errCls}>{errorText("shippingAddress")}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="shippingAddressDetail"
                className="text-sm font-medium"
              >
                상세 주소
              </Label>
              <Input
                id="shippingAddressDetail"
                name="shippingAddressDetail"
                value={formData.shippingAddressDetail}
                onChange={handleInputChange}
                readOnly={lockAddressFields}
                className={`transition-all duration-200 ${lockAddressFields ? "bg-muted text-muted-foreground cursor-not-allowed" : "focus:ring-2 focus:ring-ring"}`}
                placeholder="상세 주소를 입력해주세요"
              />
            </div>
          </>
        )}
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">
          수거 방식 <span className="text-destructive">*</span>
        </Label>

        {/* {normalizeCollection(formData.collectionMethod) === 'self_ship' && applicationId && (
          <div
            className="block cursor-pointer rounded-xl border border-border bg-card/90 dark:bg-card px-4 py-3 shadow-sm hover:bg-background dark:hover:bg-card transition text-sm peer-data-[state=checked]:border-primary/30 peer-data-[state=checked]:bg-primary/10 dark:peer-data-[state=checked]:bg-primary/20 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-ring"
          >
            <div className="font-semibold mb-1 text-foreground">자가 발송 안내</div>
            <p className="mb-3 text-foreground">편의점/우체국 등으로 직접 발송하실 수 있어요. 운송장/포장 가이드는 아래 버튼에서 확인하세요.</p>
            <button
              type="button"
              onClick={async () => {
                try {
                  // 초안의 수거방식을 자가발송으로 저장
                  await fetch(`/api/applications/stringing/${applicationId}/shipping`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      shippingInfo: { collectionMethod: 'self_ship' },
                    }),
                  });
                } catch {}
                // 그리고 안내 페이지로 이동
                router.push(`/services/applications/${applicationId}/shipping`);
              }}
              className="inline-flex items-center rounded-md bg-muted px-3 py-2 text-foreground hover:bg-muted shadow-sm focus:outline-none focus:ring-2 focus:ring-ring dark:focus:ring-ring"
            >
              운송장/자가발송 안내 보기
            </button>
          </div>
        )} */}
        <RadioGroup
          value={formData.collectionMethod}
          onValueChange={(v) =>
            setFormData((prev: any) => {
              // 주문 연동 모드에서는 수거 방식 변경 자체를 막는다.
              if (lockCollection) return prev;
              //  비활성화된 옵션은 선택 자체를 막는다(혹시 UI에서 클릭 이벤트가 들어와도 방어)
              if (v === "courier_pickup" && courierPickupDisabled) return prev;
              const prevCollection = normalizeCollection(prev.collectionMethod);
              const nextCollection = normalizeCollection(v as CollectionMethod);
              const next = { ...prev, collectionMethod: v as CollectionMethod };
              // 방문 접수 시, 날짜/시간 필드는 초기화 (기존에 선택된게 있다면)
              if (nextCollection === "visit") {
                shippingAddressSnapshotRef.current = {
                  shippingPostcode: String(prev.shippingPostcode || ""),
                  shippingAddress: String(prev.shippingAddress || ""),
                  shippingAddressDetail: String(
                    prev.shippingAddressDetail || "",
                  ),
                };
                (next as any).preferredDate = "";
                (next as any).preferredTime = "";
                (next as any).shippingPostcode = "";
                (next as any).shippingAddress = "";
                (next as any).shippingAddressDetail = "";
              } else if (prevCollection === "visit") {
                const snapshot = shippingAddressSnapshotRef.current;
                (next as any).shippingPostcode = String(
                  prev.shippingPostcode || "",
                ).trim()
                  ? prev.shippingPostcode
                  : snapshot.shippingPostcode;
                (next as any).shippingAddress = String(
                  prev.shippingAddress || "",
                ).trim()
                  ? prev.shippingAddress
                  : snapshot.shippingAddress;
                (next as any).shippingAddressDetail = String(
                  prev.shippingAddressDetail || "",
                ).trim()
                  ? prev.shippingAddressDetail
                  : snapshot.shippingAddressDetail;
              }
              return next;
            })
          }
          className="grid gap-3 md:grid-cols-3"
        >
          {/* 자가 발송 */}
          <div>
            <RadioGroupItem
              id="cm-self"
              value="self_ship"
              disabled={lockCollection || isVisitDelivery}
              className="peer sr-only"
            />
            <Label
              htmlFor="cm-self"
              className="block cursor-pointer rounded-xl border border-border bg-card px-4 py-3 shadow-sm hover:bg-background dark:hover:bg-card transition peer-data-[state=checked]:border-primary/30 peer-data-[state=checked]:bg-primary/10 dark:peer-data-[state=checked]:bg-primary/20 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-ring peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">자가 발송</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                편의점/우체국 등
              </p>
            </Label>
          </div>

          {/* 매장 방문 접수 */}
          <div>
            <RadioGroupItem
              id="cm-visit"
              value="visit"
              disabled={
                lockCollection /* 방문 모드도 주문 기반이면 변경 금지 */
              }
              className="peer sr-only"
            />
            <Label
              htmlFor="cm-visit"
              className="block cursor-pointer rounded-xl border border-border bg-card px-4 py-3 shadow-sm hover:bg-background dark:hover:bg-card transition peer-data-[state=checked]:border-primary/30 peer-data-[state=checked]:bg-primary/10 dark:peer-data-[state=checked]:bg-primary/20 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-ring peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">
                  매장 방문 접수
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                방문 가능 시간대만 선택
              </p>
            </Label>
          </div>

          {/* 기사 방문 수거  */}
          <div>
            <RadioGroupItem
              id="cm-pickup"
              value="courier_pickup"
              disabled={courierPickupDisabled || lockVisit}
              className="peer sr-only"
            />

            <Label
              htmlFor="cm-pickup"
              className="block cursor-pointer rounded-xl border border-border bg-card px-4 py-3 shadow-sm hover:bg-background dark:hover:bg-card transition peer-data-[state=checked]:border-primary/30 peer-data-[state=checked]:bg-primary/10 dark:peer-data-[state=checked]:bg-primary/20 peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-ring peer-disabled:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:hover:bg-card dark:peer-disabled:hover:bg-card"
            >
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">
                  택배 기사 방문 수거
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                선택 시 +3,000원 (후정산)
              </p>
            </Label>
          </div>
        </RadioGroup>
        {lockCollection && (
          <p className="mt-2 text-xs text-muted-foreground">
            라켓 구매 단계에서 선택한 접수 방식은 변경할 수 없습니다.
          </p>
        )}

        {/* 기사 방문 수거 선택 시 추가 입력 */}
        {normalizeCollection(formData.collectionMethod) === "courier_pickup" &&
          !courierPickupDisabled && (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="pickupDate" className="text-sm font-medium">
                  수거 희망일
                </Label>
                <Input
                  id="pickupDate"
                  name="pickupDate"
                  type="date"
                  value={formData.pickupDate}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pickupTime" className="text-sm font-medium">
                  수거 시간대
                </Label>
                <Input
                  id="pickupTime"
                  name="pickupTime"
                  placeholder="예: 10:00~13:00"
                  value={formData.pickupTime}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pickupNote" className="text-sm font-medium">
                  기사 메모(선택)
                </Label>
                <Input
                  id="pickupNote"
                  name="pickupNote"
                  placeholder="공동현관 비번/경비실 맡김 등"
                  value={formData.pickupNote}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          )}

        {normalizeCollection(formData.collectionMethod) === "courier_pickup" &&
          !courierPickupDisabled && (
            <p className="text-xs text-muted-foreground">
              ※ 기사 방문 수거 선택 시 수거비 +3,000원이 발생합니다(후정산 /
              결제 합산은 관리자 확정 시 반영).
            </p>
          )}
      </div>
      {/* 로딩 오버레이 */}
      {isUserLoading && (
        <div className="absolute inset-0 z-10 rounded-2xl bg-card/45 dark:bg-card backdrop-blur-[2px] ring-1 ring-inset ring-ring grid place-content-center">
          <div className="flex items-center gap-3 text-foreground">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-transparent" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      )}
      {(orderId || isMember) && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-4 dark:bg-warning/15">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-warning mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-warning mb-1">📢 안내사항</p>
              <p className="text-foreground leading-relaxed">
                신청자 정보는{" "}
                <span className="font-semibold">주문 당시 정보</span>를 기준으로
                작성됩니다. 회원정보를 수정하셨더라도{" "}
                <span className="font-semibold">
                  신청자 정보는 변경되지 않습니다.
                </span>
                <br />
                변경이 필요한 경우,{" "}
                <span className="text-warning font-semibold">
                  추가 요청사항
                </span>
                에 기재해주세요.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
