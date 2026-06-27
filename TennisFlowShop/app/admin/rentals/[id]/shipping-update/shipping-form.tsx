"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminPageSection from "@/components/admin/AdminPageSection";
import { adminTypography } from "@/components/admin/admin-typography";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Truck } from "lucide-react";
import { showErrorToast } from "@/lib/toast";
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard";
import { adminFetcher, adminMutator } from "@/lib/admin/adminFetcher";
import { runAdminActionWithToast } from "@/lib/admin/adminActionHelpers";
import { getSelectableCourierCatalog, normalizeCourierCode } from "@/lib/shipping/courier-map";
import {
  isValidTrackingNumberLength,
  normalizeTrackingNumber,
} from "@/lib/shipping/tracking-number";

// dirty 비교용 시그니처(운송장 번호는 공백/하이픈 제거한 값 기준으로 비교)
const shippingSig = (v: { courier: string; tracking: string; date: string }) =>
  JSON.stringify({
    courier: normalizeCourierCode(v.courier),
    tracking: normalizeTrackingNumber(v.tracking),
    date: String(v.date ?? ""),
  });

export default function ShippingForm({ rentalId }: { rentalId: string }) {
  const router = useRouter();
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);
  const [isVisitPickup, setIsVisitPickup] = useState(false);

  // 프리필(초기 로드) 기준선(baseline)
  const [initialSig, setInitialSig] = useState("");
  // 저장 성공 후 뒤로가기 시 confirm 뜨지 않게 가드 제어
  const [guardOn, setGuardOn] = useState(true);

  const currentSig = useMemo(
    () => shippingSig({ courier, tracking, date }),
    [courier, tracking, date],
  );
  const isDirty = Boolean(initialSig) && currentSig !== initialSig;
  useUnsavedChangesGuard(guardOn && isDirty);

  // 프리필(수정용): GET /api/admin/rentals/[id] 읽어서 shipping.outbound 있으면 기본값 세팅
  useEffect(() => {
    (async () => {
      const json = await adminFetcher<any>(`/api/admin/rentals/${rentalId}`, {
        cache: "no-store",
      });
      const pickupMethod = String(json?.servicePickupMethod ?? "").toUpperCase();
      const isVisit = pickupMethod === "SHOP_VISIT";
      setIsVisitPickup(isVisit);
      const out = json?.shipping?.outbound;
      const next = {
        courier: normalizeCourierCode(out?.courier) || "",
        tracking: normalizeTrackingNumber(out?.trackingNumber),
        date: out?.shippedAt ? String(out.shippedAt).slice(0, 10) : "",
      };
      setCourier(next.courier);
      setTracking(next.tracking);
      setDate(next.date);
      // baseline은 “로드 완료 시점” 값으로 1회만 세팅
      setInitialSig((sig) => sig || shippingSig(next));
      setHasExisting(true);
    })();
  }, [rentalId]);

  const onSave = async () => {
    if (isVisitPickup) return showErrorToast("방문 수령 대여는 인도 운송장을 등록할 수 없습니다.");
    if (!courier) return showErrorToast("택배사를 선택해주세요");
    const normalizedCourier = normalizeCourierCode(courier);
    const normalizedTracking = normalizeTrackingNumber(tracking);
    if (!tracking) return showErrorToast("운송장 번호를 입력해주세요");
    if (!isValidTrackingNumberLength(normalizedTracking))
      return showErrorToast("운송장 번호는 숫자 9~20자리로 입력해주세요.");
    setBusy(true);
    const result = await runAdminActionWithToast({
      action: () =>
        adminMutator(`/api/admin/rentals/${rentalId}/shipping/outbound`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courier: normalizedCourier,
            trackingNumber: normalizedTracking,
            shippedAt: date,
          }),
        }),
      successMessage: "인도 운송장을 저장했습니다",
      fallbackErrorMessage: "등록 실패",
    });
    setBusy(false);
    if (!result) return;

    /**
     * 저장 성공 후 뒤로가기 UX
     * - guard가 켜져 있으면(popstate confirm) 저장 직후에도 경고가 뜰 수 있음
     * - guardOn=false로 내려서 훅 cleanup이 더미 히스토리를 먼저 정리(back 1회)
     * - 그 다음 tick에서 실제로 이전 페이지로 back (back 1회 추가)
     */
    setGuardOn(false);
    setTimeout(() => history.back(), 0);
  };

  if (isVisitPickup) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <AdminPageSection
          title="방문 수령 대여 안내"
          description="방문 수령 대여는 인도 운송장 등록이 필요하지 않습니다."
          icon={Truck}
          contentClassName="space-y-5"
        >
          <p className={adminTypography.body}>
            이 대여는 방문 수령 건이라 인도 운송장 등록이 필요하지 않습니다.
          </p>
          <Button variant="outline" onClick={() => router.push(`/admin/rentals/${rentalId}`)}>
            상세로 돌아가기
          </Button>
        </AdminPageSection>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <AdminPageSection
        title={`인도 운송장 ${hasExisting ? "수정" : "등록"}`}
        description="대여 상품 인도에 필요한 택배사와 운송장 번호를 관리합니다."
        icon={Truck}
        contentClassName="p-0"
      >
        <div className="space-y-4 p-5 sm:p-6">
          <div className="space-y-2">
            <Label className={adminTypography.bodyStrong}>택배사</Label>
            <Select
              value={courier}
              onValueChange={(value) => setCourier(normalizeCourierCode(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="택배사를 선택" />
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
            <Label className={adminTypography.bodyStrong}>운송장 번호</Label>
            <Input
              value={tracking}
              inputMode="numeric"
              maxLength={20}
              placeholder="숫자만 입력 (9~20자리)"
              onChange={(e) => setTracking(normalizeTrackingNumber(e.target.value).slice(0, 20))}
            />
          </div>
          <div className="space-y-2">
            <Label className={adminTypography.bodyStrong}>인도일(선택)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="border-t border-border/60 p-5 pt-4 sm:p-6 sm:pt-4">
          <Button onClick={onSave} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} 저장
          </Button>
        </div>
      </AdminPageSection>
    </div>
  );
}
