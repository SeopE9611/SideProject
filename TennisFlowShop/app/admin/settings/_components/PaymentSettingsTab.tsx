"use client";
import AdminPageSection from "@/components/admin/AdminPageSection";
import { AdminSemanticBadge as Badge } from "@/components/admin/AdminSemanticBadge";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { TabsContent } from "@/components/ui/tabs";
import type { TabErrorState } from "@/types/admin/settings";

export function PaymentSettingsTab({
  error,
  paymentMeta,
}: {
  error: TabErrorState;
  paymentMeta: {
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
  const nicepayMode =
    paymentMeta.nicepay.mode === "sandbox"
      ? { tone: "info" as const, label: "Sandbox" }
      : paymentMeta.nicepay.mode === "production"
        ? { tone: "success" as const, label: "Production" }
        : { tone: "warning" as const, label: "확인 필요" };

  return (
    <TabsContent value="payment">
      <AdminPageSection
        title="결제 설정"
        description="배포 환경에 설정된 실제 NICEPay 결제 연동 상태를 확인합니다."
      >
        {error.message && (
          <div
            className={`${adminSurface.cardMuted} px-3 py-2 ${adminTypography.body} text-destructive`}
          >
            {error.message}
          </div>
        )}
        <div className="overflow-hidden rounded-lg border border-border bg-background">
          <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={adminTypography.panelTitle}>NICEPay 연동 상태</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={paymentMeta.nicepay.enabled ? "success" : "danger"}>
                  {paymentMeta.nicepay.enabled ? "활성" : "비활성"}
                </Badge>
                <Badge tone={nicepayMode.tone}>{nicepayMode.label}</Badge>
              </div>
            </div>

            <dl className="mt-4 divide-y divide-border/60 border-y border-border/60">
              <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
                <dt className={adminTypography.metaMuted}>사용 PG</dt>
                <dd className={adminTypography.bodyStrong}>{paymentMeta.nicepay.provider}</dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
                <dt className={adminTypography.metaMuted}>승인 API Base URL</dt>
                <dd className={`${adminTypography.metaMuted} break-all font-mono`}>
                  {paymentMeta.nicepay.approveApiBase ?? "미설정"}
                </dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
                <dt className={adminTypography.metaMuted}>Client ID</dt>
                <dd>
                  <Badge tone={paymentMeta.nicepay.hasClientId ? "success" : "warning"}>
                    {paymentMeta.nicepay.hasClientId ? "설정됨" : "미설정"}
                  </Badge>
                </dd>
              </div>
              <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
                <dt className={adminTypography.metaMuted}>Secret Key</dt>
                <dd>
                  <Badge tone={paymentMeta.nicepay.hasSecretKey ? "success" : "warning"}>
                    {paymentMeta.nicepay.hasSecretKey ? "설정됨" : "미설정"}
                  </Badge>
                </dd>
              </div>
            </dl>
          </div>

          <div className="space-y-1 border-t border-border/60 bg-muted/20 px-4 py-3">
            <p className={adminTypography.panelTitle}>운영 안내</p>
            <p className={adminTypography.metaMuted}>
              NICEPay 환경변수는 배포 환경(Vercel)에서 관리합니다.
            </p>
            <p className={adminTypography.metaMuted}>
              주문/대여/패키지 결제 동기화는 각 상세 페이지에서 수행됩니다.
            </p>
            <p className={adminTypography.metaMuted}>
              실제 결제 취소/환불은 각 도메인 상세 페이지의 승인 흐름에서 처리됩니다.
            </p>
          </div>
        </div>
      </AdminPageSection>
    </TabsContent>
  );
}
