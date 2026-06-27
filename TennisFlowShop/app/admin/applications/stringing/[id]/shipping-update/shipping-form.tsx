"use client";

import AdminPageSection from "@/components/admin/AdminPageSection";
import { adminTypography } from "@/components/admin/admin-typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminMutator, getAdminErrorMessage } from "@/lib/admin/adminFetcher";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { normalizeOrderShippingMethod } from "@/lib/order-shipping";
import { getSelectableCourierCatalog, normalizeCourierCode } from "@/lib/shipping/courier-map";
import { normalizeTrackingNumber } from "@/lib/shipping/tracking-number";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { Loader2, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

interface ShippingFormProps {
  applicationId: string;
  initialShippingMethod?: string;
  initialEstimatedDelivery?: string;
  initialCourier?: string;
  initialTrackingNumber?: string;
  onSuccess?: () => void;
  isVisitPickup?: boolean;
}

const isCourierShippingMethod = (method: string) =>
  normalizeOrderShippingMethod(method) === "courier";

export default function ShippingForm({
  applicationId,
  initialShippingMethod,
  initialEstimatedDelivery,
  initialCourier,
  initialTrackingNumber,
  onSuccess,
  isVisitPickup = false,
}: ShippingFormProps) {
  const normalizedInitialMethod =
    normalizeOrderShippingMethod(initialShippingMethod) ??
    String(initialShippingMethod ?? "").trim();
  const fixedVisitMethod = "visit";
  const [shippingMethod, setShippingMethod] = useState<string>(
    isVisitPickup ? fixedVisitMethod : normalizedInitialMethod || "",
  );

  useEffect(() => {
    const normalized =
      normalizeOrderShippingMethod(initialShippingMethod) ??
      String(initialShippingMethod ?? "").trim();
    setShippingMethod(isVisitPickup ? fixedVisitMethod : normalized || "");
  }, [initialShippingMethod, isVisitPickup]);

  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(
    initialEstimatedDelivery ? new Date(initialEstimatedDelivery).toISOString().split("T")[0] : "",
  );
  const [courier, setCourier] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const isRegistered = Boolean(
    String(initialShippingMethod ?? "").trim() ||
    String(initialEstimatedDelivery ?? "").trim() ||
    String(initialCourier ?? "").trim() ||
    String(initialTrackingNumber ?? "").trim(),
  );
  const cardTitle = isVisitPickup
    ? isRegistered
      ? "방문 수령 정보 수정"
      : "방문 수령 정보 등록"
    : isRegistered
      ? "배송 정보 수정"
      : "배송 정보 등록";

  /**
   * ---- 이탈(탭 닫기/새로고침/뒤로가기/링크이동) 보호 ----
   * baseline은 "초기 props" 기준으로 잡고,
   * 택배 배송이 아닌 경우에는 courier/tracking을 ''로 정규화해서 비교한다.
   */
  const baseline = useMemo(() => {
    const normalizedBaseMethod =
      normalizeOrderShippingMethod(initialShippingMethod) ??
      String(initialShippingMethod ?? "").trim();
    const baseMethod = isVisitPickup ? fixedVisitMethod : normalizedBaseMethod;
    const baseEstimated = initialEstimatedDelivery
      ? new Date(initialEstimatedDelivery).toISOString().split("T")[0]
      : "";

    // 방문 수령(visit) 등 택배가 아닌 경우, 택배정보는 의미 없으므로 baseline에서도 ''로 맞춘다.
    const baseCourier = isCourierShippingMethod(baseMethod)
      ? normalizeCourierCode(initialCourier)
      : "";
    const baseTracking = isCourierShippingMethod(baseMethod)
      ? normalizeTrackingNumber(initialTrackingNumber)
      : "";

    return {
      shippingMethod: baseMethod,
      estimatedDelivery: baseEstimated,
      courier: baseCourier,
      trackingNumber: baseTracking,
    };
  }, [
    initialShippingMethod,
    initialEstimatedDelivery,
    initialCourier,
    initialTrackingNumber,
    isVisitPickup,
  ]);

  const isDirty = useMemo(() => {
    const curMethod = isVisitPickup ? fixedVisitMethod : String(shippingMethod ?? "").trim();
    const curCourier = isCourierShippingMethod(curMethod) ? normalizeCourierCode(courier) : "";
    const curTracking = isCourierShippingMethod(curMethod)
      ? normalizeTrackingNumber(trackingNumber)
      : "";

    return (
      baseline.shippingMethod !== curMethod ||
      baseline.estimatedDelivery !== estimatedDelivery ||
      baseline.courier !== curCourier ||
      baseline.trackingNumber !== curTracking
    );
  }, [baseline, shippingMethod, estimatedDelivery, courier, trackingNumber, isVisitPickup]);

  // 저장 중에는 confirm을 띄우지 않도록(UX)
  useUnsavedChangesGuard(isDirty && !isSubmitting);

  useEffect(() => {
    setCourier(normalizeCourierCode(initialCourier) || "");
  }, [initialCourier]);

  useEffect(() => {
    setTrackingNumber(normalizeTrackingNumber(initialTrackingNumber));
  }, [initialTrackingNumber]);

  useEffect(() => {
    if (!isCourierShippingMethod(shippingMethod)) {
      setCourier("");
      setTrackingNumber("");
    }
  }, [shippingMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shippingMethod && !isVisitPickup) {
      showErrorToast("배송 방법을 선택해주세요");
      return;
    }

    if (!estimatedDelivery) {
      showErrorToast("예상 수령일을 입력해주세요");
      return;
    }

    const effectiveMethod = isVisitPickup ? fixedVisitMethod : shippingMethod;

    if (isCourierShippingMethod(effectiveMethod)) {
      if (!courier) {
        showErrorToast("택배사를 선택해주세요");
        return;
      }
      const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
      if (!normalizedTrackingNumber) {
        showErrorToast("운송장 번호를 입력해주세요");
        return;
      }
      if (normalizedTrackingNumber.length < 9 || normalizedTrackingNumber.length > 20) {
        showErrorToast("운송장 번호는 숫자 9~20자리로 입력해주세요");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await adminMutator(`/api/admin/applications/stringing/${applicationId}/shipping`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shippingInfo: {
            shippingMethod: effectiveMethod,
            estimatedDate: estimatedDelivery,
            invoice: {
              courier: isCourierShippingMethod(effectiveMethod)
                ? normalizeCourierCode(courier)
                : "",
              trackingNumber: isCourierShippingMethod(effectiveMethod)
                ? normalizeTrackingNumber(trackingNumber)
                : "",
            },
          },
        }),
      });

      showSuccessToast(
        isVisitPickup
          ? isRegistered
            ? "방문 수령 정보가 수정되었습니다"
            : "방문 수령 정보가 등록되었습니다"
          : isRegistered
            ? "배송 정보가 수정되었습니다"
            : "배송 정보가 등록되었습니다",
      );

      router.refresh();
      onSuccess?.();
      router.push(`/admin/applications/stringing/${applicationId}`);
    } catch (error) {
      showErrorToast(getAdminErrorMessage(error));
      console.error("배송 정보 업데이트 오류:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminPageSection
      title={cardTitle}
      description="처리 상태에 맞춰 수령 예정일과 운송장 정보를 관리합니다."
      icon={Truck}
      className="mx-auto w-full max-w-md"
      contentClassName="p-0"
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="shipping-method" className={adminTypography.bodyStrong}>
              {isVisitPickup ? "수령 방법" : "배송 방법"}
            </Label>
            {isVisitPickup ? (
              <Input id="shipping-method" value="방문 수령" readOnly disabled />
            ) : (
              <Select value={shippingMethod} onValueChange={setShippingMethod}>
                <SelectTrigger id="shipping-method">
                  <SelectValue placeholder="배송 방법을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="courier">택배 배송</SelectItem>
                  <SelectItem value="quick">퀵 배송 (당일)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated-delivery" className={adminTypography.bodyStrong}>
              예상 수령일
            </Label>
            <Input
              id="estimated-delivery"
              type="date"
              value={estimatedDelivery}
              onChange={(e) => setEstimatedDelivery(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {!isVisitPickup && isCourierShippingMethod(shippingMethod) && (
            <>
              <div className="space-y-2">
                <Label htmlFor="courier" className={adminTypography.bodyStrong}>
                  택배사
                </Label>
                <Select value={courier} onValueChange={setCourier}>
                  <SelectTrigger id="courier">
                    <SelectValue placeholder="택배사를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {getSelectableCourierCatalog().map((item) => (
                      <SelectItem key={item.code} value={item.code}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracking-number" className={adminTypography.bodyStrong}>
                  운송장 번호
                </Label>
                <Input
                  id="tracking-number"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(normalizeTrackingNumber(e.target.value))}
                  placeholder="예: 1234567890"
                />
              </div>
            </>
          )}
        </div>

        <div className="border-t border-border/60 p-5 pt-4 sm:p-6 sm:pt-4">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </form>
    </AdminPageSection>
  );
}
