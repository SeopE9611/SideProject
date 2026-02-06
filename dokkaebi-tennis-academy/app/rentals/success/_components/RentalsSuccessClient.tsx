'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Package, Clock, ArrowRight, Shield, Truck, Phone, CreditCard, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { bankLabelMap, racketBrandLabel } from '@/lib/constants';
import SiteContainer from '@/components/layout/SiteContainer';
import RentalApplyHandoffClient from './RentalApplyHandoffClient';

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
    racket: { brand: string; model: string; condition: 'A' | 'B' | 'C' } | null;
    payment?: {
      method?: string;
      bank?: string | null;
      depositor?: string | null;
    } | null;
    refundAccount?: {
      bank?: string | null;
      account?: string | null;
      holder?: string | null;
    } | null;
  };
};

export default function RentalsSuccessClient({ data }: Props) {
  const rentalId = String((data as any)?.id ?? (data as any)?._id ?? '');
  const searchParams = useSearchParams();
  const withService = searchParams.get('withService') === '1';

  useEffect(() => {
    if (withService) return;

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
  }, [withService]);

  // withService=1 인 경우: 성공 페이지에서 상세(대여 정보/계좌/요약)를 보여주지 않고,
  // 교체 서비스 신청서 작성으로만 안내/이동
  // (최종 결제/계산서/계좌 안내는 신청서 제출 후 success 페이지에서 노출)
  if (withService) {
    return (
      <div className="min-h-[70vh] bg-slate-50/50 dark:bg-slate-950/20">
        <SiteContainer variant="wide" className="py-12">
          <div className="mx-auto max-w-2xl">
            <RentalApplyHandoffClient rentalId={rentalId} />
          </div>
        </SiteContainer>
      </div>
    );
  }

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
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white dark:from-green-700 dark:via-emerald-700 dark:to-teal-700">
        <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
        <SiteContainer variant="wide" className="relative py-16">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 dark:bg-white/30 backdrop-blur-sm rounded-full mb-6">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">대여 신청 접수 완료</h1>
            <p className="text-xl text-green-100 mb-6">입금 확인 후 결제완료로 상태가 변경되며, 이후 출고가 진행됩니다.</p>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer variant="wide" className="py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 스트링 교체 서비스 신청서로 이어가기 */}

          {/* 대여 정보 카드 */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-teal-500/10 p-6">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Package className="h-6 w-6 text-blue-600" />
                대여 정보
              </CardTitle>
              <CardDescription className="mt-2 text-lg">
                대여 번호: <span className="font-mono font-semibold text-blue-600">{data.id}</span>
              </CardDescription>
            </div>
            <CardContent className="p-6">
              {/* 라켓 정보 */}
              <div className="mb-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" /> 대여 라켓
                </h3>
                <div className="p-4 bg-gradient-to-r from-slate-50/50 to-blue-50/30 dark:from-slate-700/50 dark:to-slate-600/30 rounded-lg border border-slate-200/50 dark:border-slate-600/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{data.racket ? `${racketBrandLabel(data.racket.brand)} ${data.racket.model}` : '라켓 정보 없음'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">상태 {data.racket?.condition}</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">대여 기간: {data.period}일</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* 결제 금액 */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">대여 수수료</span>
                  <span className="font-semibold text-lg">{data.fee.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">보증금</span>
                  <span className="font-semibold text-lg">{data.deposit.toLocaleString()}원</span>
                </div>
                {data.stringPrice > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">스트링 상품</span>
                    <span className="font-semibold text-lg">{data.stringPrice.toLocaleString()}원</span>
                  </div>
                )}
                {data.stringingFee > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">교체 서비스</span>
                    <span className="font-semibold text-lg">{data.stringingFee.toLocaleString()}원</span>
                  </div>
                )}
                <Separator />
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex justify-between items-center text-2xl font-bold">
                    <span className="text-slate-800 dark:text-slate-200">총 결제 금액</span>
                    <span className="text-blue-600">{total.toLocaleString()}원</span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">* 반납 완료 후 보증금 환불 (연체/파손 시 차감)</p>
                </div>

                {/* 무통장 안내 카드 */}
                <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500/10 to-rose-500/10 p-6">
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <CreditCard className="h-6 w-6 text-amber-600" />
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

            <CardFooter className="bg-gradient-to-r from-slate-50/50 via-blue-50/30 to-purple-50/30 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-600/30 p-6">
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <Button
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600 hover:from-blue-700 hover:via-purple-700 hover:to-teal-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300"
                  asChild
                >
                  <Link href="/mypage?tab=rentals" className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    대여 내역 확인
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300" asChild>
                  <Link href="/rackets" className="flex items-center gap-2">
                    다른 라켓 보기
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardFooter>
          </Card>

          {/* 안내사항 */}
          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10">
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-indigo-600" />
                대여 안내사항
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                    <Truck className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-1">배송 안내</h4>
                      <p className="text-sm text-blue-600 dark:text-blue-400">결제 완료 후 배송이 시작됩니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                    <Clock className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-1">대여 기간</h4>
                      <p className="text-sm text-green-600 dark:text-green-400">대여 기간은 {data.period}일입니다. 반납 기한을 꼭 지켜주세요.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                    <Shield className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-1">보증금 환불</h4>
                      <p className="text-sm text-purple-600 dark:text-purple-400">반납 완료 시 보증금이 환불됩니다. 연체 또는 파손 시 차감될 수 있습니다.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
                    <Phone className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-1">고객 지원</h4>
                      <p className="text-sm text-orange-600 dark:text-orange-400">대여 관련 문의사항은 고객센터(02-123-4567)로 연락주세요.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500/10 to-rose-500/10 p-6">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Undo2 className="h-6 w-6 text-amber-600" />
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
