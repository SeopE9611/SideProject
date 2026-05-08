'use client';

import SiteContainer from '@/components/layout/SiteContainer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { badgeToneVariant } from '@/lib/badge-style';
import { normalizeRentalStatus } from '@/lib/admin-ops-normalize';
import { bankLabelMap, racketBrandLabel } from '@/lib/constants';
import { ArrowRight, CheckCircle, Clock, CreditCard, MapPin, Package, Phone, Shield, Truck, Undo2 } from 'lucide-react';
import Link from 'next/link';

type Props = {
  data: {
    id: string;
    period: 7 | 15 | 30;
    fee: number;
    deposit: number;
    stringPrice: number;
    stringingFee: number;
    total: number;
    status: string;
    withStringService?: boolean;
    isStringServiceApplied?: boolean;
    stringingApplicationId?: string | null;
    applicationSummary?: {
      status: string;
      lineCount: number;
      stringNames: string[];
      tensionSummary: string | null;
      receptionLabel: string;
      reservationLabel: string | null;
    } | null;
    queryHint?: {
      withService?: boolean | null;
      stringingSubmitted?: boolean | null;
      stringingApplicationId?: string | null;
    };
    racket: { brand: string; model: string; condition: 'A' | 'B' | 'C' } | null;
    payment?: {
      method?: string;
      bank?: string | null;
      depositor?: string | null;
    } | null;
    paymentStatus?: string | null;
    paidAt?: string | null;
    paymentInfo?: {
      status?: string | null;
      provider?: string | null;
      method?: string | null;
      tid?: string | null;
      approvedAt?: string | null;
      easyPayProvider?: string | null;
      cardDisplayName?: string | null;
      cardCompany?: string | null;
      cardLabel?: string | null;
    } | null;
    shipping?: {
      name?: string | null;
      phone?: string | null;
      postalCode?: string | null;
      address?: string | null;
      addressDetail?: string | null;
      deliveryRequest?: string | null;
      shippingMethod?: string | null;
    } | null;
    refundAccount?: {
      bank?: string | null;
      account?: string | null;
      holder?: string | null;
    } | null;
  };
};

export default function RentalsSuccessClient({ data }: Props) {
  const dbWithService = Boolean(data.withStringService);
  const dbStringingApplied = Boolean(data.isStringServiceApplied);
  const dbStringingApplicationId = typeof data.stringingApplicationId === 'string' ? data.stringingApplicationId : '';

  const hintedWithService = typeof data.queryHint?.withService === 'boolean' ? data.queryHint.withService : null;
  const hintedStringingSubmitted = typeof data.queryHint?.stringingSubmitted === 'boolean' ? data.queryHint.stringingSubmitted : null;
  const hintedStringingApplicationId = typeof data.queryHint?.stringingApplicationId === 'string' ? data.queryHint.stringingApplicationId : '';

  const withService = dbWithService;
  const stringingApplied = dbStringingApplied;
  const stringingApplicationId = dbStringingApplicationId;

  const hasStateMismatch =
    (hintedWithService !== null && hintedWithService !== dbWithService) ||
    (hintedStringingSubmitted !== null && hintedStringingSubmitted !== dbStringingApplied) ||
    (Boolean(hintedStringingApplicationId) && hintedStringingApplicationId !== dbStringingApplicationId);

  const stringingApplicationHref = dbStringingApplicationId ? `/mypage?tab=orders&flowType=application&flowId=${encodeURIComponent(dbStringingApplicationId)}&from=orders` : null;
  const isPickup = data.shipping?.shippingMethod === 'pickup';

  const total = typeof data.total === 'number' ? data.total : data.fee + data.deposit + (data.stringPrice ?? 0) + (data.stringingFee ?? 0);
  const bankKeyFromServer = data.payment?.bank || '';
  const depositorFromServer = data.payment?.depositor || '';
  const bankKeyFallback = (typeof window !== 'undefined' && sessionStorage.getItem('rentals-last-bank')) || '';
  const depositorFallback = (typeof window !== 'undefined' && sessionStorage.getItem('rentals-last-depositor')) || '';
  const bankKey = bankKeyFromServer || bankKeyFallback;
  const depositor = depositorFromServer || depositorFallback;
  const bankInfo = bankKey ? (bankLabelMap as any)[bankKey] : null;

  const refundBankKey = data.refundAccount?.bank || (typeof window !== 'undefined' && sessionStorage.getItem('rentals-refund-bank')) || '';
  const refundAccount = data.refundAccount?.account || (typeof window !== 'undefined' && sessionStorage.getItem('rentals-refund-account')) || '';
  const refundHolder = data.refundAccount?.holder || (typeof window !== 'undefined' && sessionStorage.getItem('rentals-refund-holder')) || '';
  const refundBankInfo = refundBankKey ? (bankLabelMap as any)[refundBankKey] : null;

  const isNicePaid = data.paymentInfo?.provider === 'nicepay' || data.payment?.method === 'nicepay';
  const paymentMethodLabel = isNicePaid
    ? data.paymentInfo?.easyPayProvider
      ? `NicePay (${data.paymentInfo.easyPayProvider})`
      : 'NicePay'
    : '무통장입금';
  return (
    <div className="min-h-full bg-muted/30">
      <div className="relative overflow-hidden bg-muted/30 text-foreground">
        <div className="absolute inset-0 bg-overlay/20 dark:bg-overlay/40"></div>
        <SiteContainer variant="wide" className="relative py-10 md:py-16">
          <div className="text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-card border border-border shadow-sm">
              <CheckCircle className="h-12 w-12 text-foreground" />
            </div>
            <h1 className="mb-4 text-3xl font-bold md:text-4xl">대여 신청 접수 완료</h1>
            <p className="mb-6 text-xl text-success">신청이 정상 접수되었습니다. 결제 상태에 따라 출고가 진행됩니다.</p>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-8">
        <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
          {hasStateMismatch && (
            <Card className="border border-warning/40 bg-warning/10 shadow-sm">
              <CardHeader className="bg-warning/10">
                <CardTitle className="text-base text-warning">접수 상태 확인 중</CardTitle>
                <CardDescription className="text-warning/90">최신 상태 동기화 중입니다. 잠시 후 새로고침하거나 마이페이지에서 최종 상태를 확인해 주세요.</CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card className="overflow-hidden border border-border bg-card shadow-md">
            <div className="bg-muted/30 p-4 md:p-6">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Package className="h-6 w-6 text-primary" />
                대여 정보
                {withService && <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">교체서비스 포함</span>}
              </CardTitle>
              <CardDescription className="mt-2 text-lg">접수된 대여 및 교체서비스 정보를 함께 확인하세요.</CardDescription>
            </div>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4 text-sm">
                <p>
                  <span className="text-muted-foreground">대여 번호:</span> <span className="font-mono font-semibold text-foreground">{data.id}</span>
                </p>
                {withService && stringingApplicationId && (
                  <p>
                    <span className="text-muted-foreground">교체서비스 신청 번호:</span>{' '}
                    <span className="font-mono font-semibold text-foreground">{stringingApplicationId}</span>
                  </p>
                )}
                <p>
                  <span className="text-muted-foreground">대여 상태:</span> <span className="font-semibold text-foreground">{normalizeRentalStatus(data.status)}</span>
                </p>
                {withService && (
                  <p>
                    <span className="text-muted-foreground">교체서비스 상태:</span>{' '}
                    <span className="font-semibold text-foreground">
                      {stringingApplied ? data.applicationSummary?.status || '접수완료' : '접수 확인 중'}
                    </span>
                  </p>
                )}
              </div>

              <Separator className="my-4 md:my-6" />

              <div className="mb-4 md:mb-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Package className="h-5 w-5 text-foreground" /> 대여 라켓
                </h3>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{data.racket ? `${racketBrandLabel(data.racket.brand)} ${data.racket.model}` : '라켓 정보 없음'}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={badgeToneVariant('brand')} className="px-2 py-0.5 text-xs">
                          상태 {data.racket?.condition}
                        </Badge>
                        <span className="text-sm text-muted-foreground">대여 기간: {data.period}일</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {withService && stringingApplied && data.applicationSummary && (
                <>
                  <Separator className="my-4 md:my-6" />
                  <div className="space-y-3">
                    <h3 className="text-lg font-bold text-foreground">교체서비스 정보</h3>
                    <div className="space-y-2 rounded-lg border border-border bg-background p-4 text-sm">
                      <p>
                        <span className="text-muted-foreground">접수 방식:</span> <span className="font-semibold text-foreground">{data.applicationSummary.receptionLabel}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">라인 수:</span> <span className="font-semibold text-foreground">{data.applicationSummary.lineCount}개</span>
                      </p>
                      {data.applicationSummary.stringNames.length > 0 && (
                        <p>
                          <span className="text-muted-foreground">선택 스트링:</span> <span className="font-semibold text-foreground">{data.applicationSummary.stringNames.join(', ')}</span>
                        </p>
                      )}
                      {data.applicationSummary.tensionSummary && (
                        <p>
                          <span className="text-muted-foreground">텐션:</span> <span className="font-semibold text-foreground">{data.applicationSummary.tensionSummary}</span>
                        </p>
                      )}
                      {data.applicationSummary.reservationLabel && (
                        <p>
                          <span className="text-muted-foreground">방문 예약:</span> <span className="font-semibold text-foreground">{data.applicationSummary.reservationLabel}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator className="my-4 md:my-6" />

              <div className="space-y-4">
                <h3 className="text-lg font-bold text-foreground">금액 정보</h3>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">대여 수수료</span>
                  <span className="text-lg font-semibold">{data.fee.toLocaleString()}원</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">보증금</span>
                  <span className="text-lg font-semibold">{data.deposit.toLocaleString()}원</span>
                </div>
                {data.stringPrice > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">스트링 상품</span>
                    <span className="text-lg font-semibold">{data.stringPrice.toLocaleString()}원</span>
                  </div>
                )}
                {data.stringingFee > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">교체서비스</span>
                    <span className="text-lg font-semibold">{data.stringingFee.toLocaleString()}원</span>
                  </div>
                )}
                <Separator />
                <div className="rounded-xl border border-border bg-muted/30 p-4 md:p-6">
                  <div className="flex items-center justify-between text-2xl font-bold">
                    <span className="text-foreground">총 결제 금액</span>
                    <span className="text-primary">{total.toLocaleString()}원</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">* 반납 완료 후 보증금 환불 (연체/파손 시 차감)</p>
                </div>
              </div>

              <Separator className="my-4 md:my-6" />

              <div className="space-y-3">
                <h3 className="text-lg font-bold text-foreground">결제 정보</h3>
                {isNicePaid ? (
                  <div className="rounded-lg border border-border bg-background p-4 text-sm space-y-1">
                    <p className="text-muted-foreground">결제가 완료되었습니다.</p>
                    <div>결제수단: <b>{paymentMethodLabel}</b></div>
                    {data.paymentInfo?.approvedAt && <div>승인시각: <b>{new Date(data.paymentInfo.approvedAt).toLocaleString('ko-KR')}</b></div>}
                    {data.paymentInfo?.cardCompany && <div>카드사: <b>{data.paymentInfo.cardCompany}</b></div>}
                    {data.paymentInfo?.tid && <div>TID: <b>{data.paymentInfo.tid}</b></div>}
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-background p-4 text-sm">
                    <p className="text-muted-foreground">아래 계좌로 입금해 주세요. 입금 확인 후 결제완료로 상태가 변경됩니다.</p>
                    {bankInfo && (
                      <div className="mt-4 space-y-1">
                        <div>
                          은행: <b>{bankInfo.label}</b>
                        </div>
                        <div>
                          계좌: <b>{bankInfo.account}</b>
                        </div>
                        <div>
                          예금주: <b>{bankInfo.holder}</b>
                        </div>
                        {depositor && (
                          <div>
                            입금자명: <b>{depositor}</b>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator className="my-4 md:my-6" />

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <MapPin className="h-5 w-5 text-foreground" />
                  수령 정보
                </h3>
                <div className="space-y-2 rounded-lg border border-border bg-background p-4 text-sm">
                  {isPickup ? (
                    <>
                      <p>
                        <span className="text-muted-foreground">수령 방식:</span> <span className="font-semibold">방문 수령 선택됨</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">이름:</span> <span className="font-semibold">{data.shipping?.name || '-'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">연락처:</span> <span className="font-semibold">{data.shipping?.phone || '-'}</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <span className="text-muted-foreground">이름:</span> <span className="font-semibold">{data.shipping?.name || '-'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">연락처:</span> <span className="font-semibold">{data.shipping?.phone || '-'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">우편번호:</span> <span className="font-semibold">{data.shipping?.postalCode || '-'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">주소:</span> <span className="font-semibold">{data.shipping?.address || '-'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">상세주소:</span> <span className="font-semibold">{data.shipping?.addressDetail || '-'}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">요청사항:</span> <span className="font-semibold">{data.shipping?.deliveryRequest || '-'}</span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              <Separator className="my-4 md:my-6" />

              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
                  <Undo2 className="h-5 w-5 text-foreground" />
                  보증금 환급 계좌
                </h3>
                <div className="rounded-lg border border-border bg-background p-4 text-sm">
                  <p className="text-muted-foreground">반납 완료 후 아래 계좌로 보증금을 환급해 드립니다.</p>
                  <div className="mt-4 space-y-1">
                    {refundBankInfo && (
                      <div>
                        은행: <b>{refundBankInfo.label}</b>
                      </div>
                    )}
                    {refundAccount && (
                      <div>
                        계좌: <b>{refundAccount}</b>
                      </div>
                    )}
                    {refundHolder && (
                      <div>
                        예금주: <b>{refundHolder}</b>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/30 p-4 md:p-6">
              <div className="flex w-full flex-col gap-4 sm:flex-row">
                <Button className="h-12 flex-1 shadow-sm transition-[box-shadow,background-color,color] duration-200 hover:shadow-md" asChild>
                  <Link href="/mypage?tab=orders" className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    대여 내역 확인
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                {stringingApplicationHref ? (
                  <Button variant="outline" className="h-12 flex-1 shadow-sm transition-[box-shadow,background-color,color] duration-200 hover:shadow-md" asChild>
                    <Link href={stringingApplicationHref} className="flex items-center gap-2">
                      교체서비스 신청 내역 보기
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
                <Button variant="ghost" className="h-12 flex-1 shadow-sm transition-[box-shadow,background-color,color] duration-200 hover:shadow-md" asChild>
                  <Link href="/rackets" className="flex items-center gap-2">
                    다른 라켓 보기
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card className="border border-border bg-card shadow-sm">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-foreground" />
                대여 안내사항
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-4">
                    <Truck className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="mb-1 font-semibold text-foreground">{isPickup ? '방문 수령 안내' : '배송 안내'}</h4>
                      <p className="text-sm text-muted-foreground">{isPickup ? '입금 확인 후 매장에서 수령 준비가 진행됩니다.' : '결제 완료 후 배송이 시작됩니다.'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-4">
                    <Clock className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="mb-1 font-semibold text-foreground">대여 기간</h4>
                      <p className="text-sm text-muted-foreground">대여 기간은 {data.period}일입니다. 반납 기한을 꼭 지켜주세요.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-4">
                    <Shield className="mt-0.5 h-5 w-5 text-foreground" />
                    <div>
                      <h4 className="mb-1 font-semibold text-foreground">보증금 환불</h4>
                      <p className="text-sm text-muted-foreground">반납 완료 시 보증금이 환불됩니다. 연체 또는 파손 시 차감될 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg bg-muted/30 p-4">
                    <Phone className="mt-0.5 h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="mb-1 font-semibold text-foreground">고객 지원</h4>
                      <p className="text-sm text-muted-foreground">대여 관련 문의사항은 고객센터(0507-1392-3493)로 연락주세요.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SiteContainer>
    </div>
  );
}
