'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle, Package, Clock, ArrowRight, Shield, Truck, Phone, CreditCard, Undo2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { bankLabelMap, racketBrandLabel } from '@/lib/constants';
import { badgeToneVariant } from '@/lib/badge-style';
import SiteContainer from '@/components/layout/SiteContainer';

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

  // 최종 렌더는 DB 상태를 기준으로 하고, query hint는 상태 불일치 감지용 보조 신호로만 사용한다.
  const withService = dbWithService;
  const stringingApplied = dbStringingApplied;
  const stringingApplicationId = dbStringingApplicationId;

  const hasStateMismatch =
    (hintedWithService !== null && hintedWithService !== dbWithService) ||
    (hintedStringingSubmitted !== null && hintedStringingSubmitted !== dbStringingApplied) ||
    (Boolean(hintedStringingApplicationId) && hintedStringingApplicationId !== dbStringingApplicationId);

  const stringingApplicationHref = dbStringingApplicationId
    ? `/mypage?tab=applications&applicationId=${encodeURIComponent(dbStringingApplicationId)}`
    : null;
  // 방문수령/배송 오해 방지
  const isPickup = data.shipping?.shippingMethod === 'pickup';

  useEffect(() => {
    try {
      sessionStorage.setItem('rentals-success', '1');
      const onPop = (e: PopStateEvent) => {
        if (sessionStorage.getItem('rentals-success') === '1') {
          history.pushState(null, '', location.href);
        }
      };
      window.addEventListener('popstate', onPop);
      return () => {
        window.removeEventListener('popstate', onPop);
        sessionStorage.removeItem('rentals-success');
      };
    } catch {}
  }, []);

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
  return (
    <div className="min-h-full bg-muted/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-muted/30 text-foreground">
        <div className="absolute inset-0 bg-overlay/20 dark:bg-overlay/40"></div>
        <SiteContainer variant="wide" className="relative py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-card/20 dark:bg-card/30 backdrop-blur-sm rounded-full mb-6">
              <CheckCircle className="h-12 w-12 text-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">대여 신청 접수 완료</h1>
            <p className="text-xl text-success mb-6">입금 확인 후 결제완료로 상태가 변경되며, 이후 출고가 진행됩니다.</p>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/*
            Step 3: 대여+교체서비스가 checkout에서 이미 통합 제출된 경우에는
            /services/apply handoff를 건너뛰고 현재 success에서 "접수 완료"를 확정 안내한다.
          */}
          {withService && stringingApplied && (
            <Card className="backdrop-blur-sm bg-card/80 dark:bg-card border border-border shadow-xl">
              <CardHeader className="bg-muted/30">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <CheckCircle className="h-5 w-5 text-success" />
                  교체 서비스 통합 접수 완료
                </CardTitle>
                <CardDescription>별도 신청서 작성 없이 현재 대여 건에 함께 접수되었습니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 text-sm text-muted-foreground space-y-2">
                <p>• 교체 서비스 신청이 함께 접수되었습니다.</p>
                <p>• 별도 신청서 작성 없이 현재 대여에 포함되어 처리됩니다.</p>
                <p>• 추가 요청/장착 정보가 함께 저장되었습니다.</p>
                {stringingApplicationId ? <p className="font-mono text-xs">신청서 ID: {stringingApplicationId}</p> : null}
              </CardContent>
            </Card>
          )}

          {hasStateMismatch && (
            <Card className="backdrop-blur-sm bg-warning/10 dark:bg-warning/10 border border-warning/40 shadow-xl">
              <CardHeader className="bg-warning/10">
                <CardTitle className="text-base text-warning">접수 상태 확인 중</CardTitle>
                <CardDescription className="text-warning/90">
                  최신 상태 동기화 중입니다. 잠시 후 새로고침하거나 마이페이지에서 최종 상태를 확인해 주세요.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* 통합 접수 요약은 "교체서비스 포함 + 통합 제출 완료" 상태에서만 노출한다. */}
          {withService && stringingApplied && data.applicationSummary && (
            <Card className="backdrop-blur-sm bg-card/80 dark:bg-card border border-border shadow-xl">
              <CardHeader className="bg-muted/30 pb-3">
                <CardTitle className="text-lg">교체 서비스 접수 요약</CardTitle>
                <CardDescription>대여와 함께 접수된 장착 정보를 한눈에 확인하세요.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-2 text-sm">
                {/* 성공 화면에서는 핵심 접수 정보만 간단히 노출 */}
                <p><span className="text-muted-foreground">신청 상태:</span> <span className="font-semibold text-foreground">{data.applicationSummary.status}</span></p>
                <p><span className="text-muted-foreground">접수 방식:</span> <span className="font-semibold text-foreground">{data.applicationSummary.receptionLabel}</span></p>
                <p><span className="text-muted-foreground">라인 수:</span> <span className="font-semibold text-foreground">{data.applicationSummary.lineCount}개</span></p>
                {data.applicationSummary.stringNames.length > 0 && (
                  <p><span className="text-muted-foreground">선택 스트링:</span> <span className="font-semibold text-foreground">{data.applicationSummary.stringNames.join(', ')}</span></p>
                )}
                {data.applicationSummary.tensionSummary && (
                  <p><span className="text-muted-foreground">텐션:</span> <span className="font-semibold text-foreground">{data.applicationSummary.tensionSummary}</span></p>
                )}
                {data.applicationSummary.reservationLabel && (
                  <p><span className="text-muted-foreground">방문 예약:</span> <span className="font-semibold text-foreground">{data.applicationSummary.reservationLabel}</span></p>
                )}
              </CardContent>
            </Card>
          )}

          {/* 대여 정보 카드 */}
          <Card className="backdrop-blur-sm bg-card/80 dark:bg-card border-0 shadow-2xl overflow-hidden">
            <div className="bg-muted/30 p-6">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Package className="h-6 w-6 text-primary" />
                대여 정보
              </CardTitle>
              <CardDescription className="mt-2 text-lg">
                대여 번호: <span className="font-mono font-semibold text-primary">{data.id}</span>
              </CardDescription>
            </div>
            <CardContent className="p-6">
              {/* 라켓 정보 */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-foreground" /> 대여 라켓
                </h3>
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-foreground">{data.racket ? `${racketBrandLabel(data.racket.brand)} ${data.racket.model}` : '라켓 정보 없음'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={badgeToneVariant('brand')} className="px-2 py-0.5 text-xs">상태 {data.racket?.condition}</Badge>
                        <span className="text-sm text-muted-foreground">대여 기간: {data.period}일</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* 결제 금액 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">대여 수수료</span>
                  <span className="font-semibold text-lg">{data.fee.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">보증금</span>
                  <span className="font-semibold text-lg">{data.deposit.toLocaleString()}원</span>
                </div>
                {data.stringPrice > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">스트링 상품</span>
                    <span className="font-semibold text-lg">{data.stringPrice.toLocaleString()}원</span>
                  </div>
                )}
                {data.stringingFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">교체 서비스</span>
                    <span className="font-semibold text-lg">{data.stringingFee.toLocaleString()}원</span>
                  </div>
                )}
                <Separator />
                <div className="bg-muted/30 p-6 rounded-xl border border-border">
                  <div className="flex justify-between items-center text-2xl font-bold">
                    <span className="text-foreground">총 결제 금액</span>
                    <span className="text-primary">{total.toLocaleString()}원</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">* 반납 완료 후 보증금 환불 (연체/파손 시 차감)</p>
                </div>

                {/* 무통장 안내 카드 */}
                <Card className="backdrop-blur-sm bg-card/80 dark:bg-card border-0 shadow-2xl overflow-hidden">
                  <div className="bg-muted/30 p-6">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <CreditCard className="h-6 w-6 text-primary" />
                      무통장 입금 안내
                    </CardTitle>
                  </div>
                  <CardContent className="p-6 text-sm">
                    <p className="text-muted-foreground">
                      아래 계좌로 입금해 주세요. 입금 확인 후 <b>결제완료</b>로 상태가 변경됩니다.
                    </p>
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
                  </CardContent>
                </Card>
              </div>
            </CardContent>

            <CardFooter className="bg-muted/30 p-6">
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <Button
                  className="flex-1 h-12 bg-muted/30 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                  asChild
                >
                  <Link href="/mypage?tab=rentals" className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    대여 내역 확인
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                {stringingApplicationHref ? (
                  <Button className="flex-1 h-12 bg-muted/30 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300" asChild>
                    <Link href={stringingApplicationHref} className="flex items-center gap-2">
                      교체 서비스 신청 내역 보기
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
                <Button className="flex-1 h-12 bg-muted/30 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300" asChild>
                  <Link href="/rackets" className="flex items-center gap-2">
                    다른 라켓 보기
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* 안내사항 */}
          <Card className="backdrop-blur-sm bg-card/80 dark:bg-card border-0 shadow-xl">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-foreground" />
                대여 안내사항
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <Truck className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-primary mb-1">{isPickup ? '방문 수령 안내' : '배송 안내'}</h4>
                      <p className="text-sm text-muted-foreground">{isPickup ? '입금 확인 후 매장에서 수령 준비가 진행됩니다.' : '결제 완료 후 배송이 시작됩니다.'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <Clock className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-success mb-1">대여 기간</h4>
                      <p className="text-sm text-muted-foreground">대여 기간은 {data.period}일입니다. 반납 기한을 꼭 지켜주세요.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <Shield className="h-5 w-5 text-foreground mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">보증금 환불</h4>
                      <p className="text-sm text-muted-foreground">반납 완료 시 보증금이 환불됩니다. 연체 또는 파손 시 차감될 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg">
                    <Phone className="h-5 w-5 text-warning mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-warning mb-1">고객 지원</h4>
                      <p className="text-sm text-muted-foreground">대여 관련 문의사항은 고객센터(02-123-4567)로 연락주세요.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/80 dark:bg-card border-0 shadow-xl">
            <CardHeader className="bg-muted/30">
              <CardTitle className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-foreground" />
                수령 정보
              </CardTitle>
              <CardDescription>{isPickup ? '방문 수령으로 접수된 주문입니다.' : '배송지 정보를 확인해주세요.'}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 text-sm space-y-2">
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
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/80 dark:bg-card border-0 shadow-2xl overflow-hidden">
            <div className="bg-muted/30 p-6">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Undo2 className="h-6 w-6 text-primary" />
                보증금 환급 계좌
              </CardTitle>
            </div>
            <CardContent className="p-6 text-sm">
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
            </CardContent>
          </Card>
        </div>
      </SiteContainer>
    </div>
  );
}
