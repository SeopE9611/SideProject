"use client";
import { Save } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { TabsContent } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentSettings, TabErrorState } from "@/types/admin/settings";

export function PaymentSettingsTab({
  form,
  isBootstrapping,
  onSubmit,
  error,
  paymentMeta,
}: {
  form: UseFormReturn<PaymentSettings>;
  isBootstrapping: boolean;
  onSubmit: (data: PaymentSettings) => void;
  error: TabErrorState;
  paymentMeta: {
    hasPaypalSecret: boolean;
    hasStripeSecretKey: boolean;
    nicepay: {
      provider: "NICEPay";
      enabled: boolean;
      mode: "sandbox" | "production" | "unknown";
      approveApiBase: string | null;
      hasClientId: boolean;
      hasSecretKey: boolean;
    };
  };
}) {
  const nicepayStatus = paymentMeta.nicepay.enabled ? "활성" : "비활성";
  const nicepayModeLabel =
    paymentMeta.nicepay.mode === "sandbox"
      ? "sandbox"
      : paymentMeta.nicepay.mode === "production"
        ? "production"
        : "확인 필요";

  return (
    <TabsContent value="payment">
      <Card>
        <CardHeader>
          <CardTitle>결제 설정</CardTitle>
          <CardDescription>
            현재 운영 결제 연동은 NICEPay 기준으로 관리됩니다.
          </CardDescription>
        </CardHeader>
        {error.message && (
          <div className="mx-6 rounded border px-3 py-2 text-sm">
            {error.message}
          </div>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div>
              <Label>통화</Label>
              <Select
                value={form.watch("currency")}
                onValueChange={(v) =>
                  form.setValue("currency", v as PaymentSettings["currency"], {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="KRW">KRW</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="JPY">JPY</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="taxRate">세율</Label>
              <Input
                id="taxRate"
                type="number"
                {...form.register("taxRate", { valueAsNumber: true })}
              />
            </div>

            <div className="rounded-md border p-4 space-y-2">
              <p className="text-sm font-semibold">NICEPay 상태</p>
              <p className="text-sm">사용 PG: {paymentMeta.nicepay.provider}</p>
              <p className="text-sm">결제 기능 상태: {nicepayStatus}</p>
              <p className="text-sm">결제 모드: {nicepayModeLabel}</p>
              <p className="text-sm break-all">
                승인 API Base URL:{" "}
                {paymentMeta.nicepay.approveApiBase ?? "미설정"}
              </p>
              <p className="text-sm">
                Client ID 설정 여부:{" "}
                {paymentMeta.nicepay.hasClientId ? "설정됨" : "미설정"}
              </p>
              <p className="text-sm">
                Secret Key 설정 여부:{" "}
                {paymentMeta.nicepay.hasSecretKey ? "설정됨" : "미설정"}
              </p>
            </div>

            <div className="rounded-md border p-4 space-y-1">
              <p className="text-sm font-semibold">운영 안내</p>
              <p className="text-sm text-muted-foreground">
                NICEPay 환경변수는 배포 환경(Vercel)에서 관리합니다.
              </p>
              <p className="text-sm text-muted-foreground">
                주문/대여/패키지 결제 동기화는 각 상세 페이지에서 수행됩니다.
              </p>
              <p className="text-sm text-muted-foreground">
                실제 결제 취소/환불은 각 도메인 상세 페이지의 승인 흐름에서
                처리됩니다.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              disabled={isBootstrapping || form.formState.isSubmitting}
              type="submit"
              className="ml-auto"
            >
              <Save className="mr-2 h-4 w-4" />
              설정 저장
            </Button>
          </CardFooter>
        </form>
      </Card>
    </TabsContent>
  );
}
