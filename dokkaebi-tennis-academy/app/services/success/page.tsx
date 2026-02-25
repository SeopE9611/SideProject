import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import clientPromise from '@/lib/mongodb';
import { bankLabelMap, racketBrandLabel } from '@/lib/constants';
import jwt from 'jsonwebtoken';
import Link from 'next/link';
import { CheckCircle, Calendar, CreditCard, MapPin, Phone, Mail, User, Rocket as Racquet, Clock, Home, FileText, Shield, Award, Zap, Ticket, Package, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import BackButtonGuard from '@/app/services/_components/BackButtonGuard';
import { Badge } from '@/components/ui/badge';
import { normalizeCollection } from '@/app/features/stringing-applications/lib/collection';
import LoginGate from '@/components/system/LoginGate';
import HeroCourtBackdrop from '@/components/system/HeroCourtBackdrop';
import { verifyAccessToken } from '@/lib/auth.utils';

interface Props {
 searchParams: Promise<{
 applicationId?: string;
 }>;
}

function isValidObjectId(id: string | undefined): boolean {
 return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
 if (!token) return null;
 try {
 return verifyAccessToken(token);
 } catch {
 return null;
 }
}

// 시간 2자리 포맷
const pad2 = (n: number) => String(n).padStart(2, '0');

// 방문 예약 일시를 "YYYY-MM-DD HH:mm ~ HH:mm (n슬롯 / 총 m분)" 형태로
function formatVisitTimeRange(preferredDate?: string, preferredTime?: string, durationMinutes?: number | null, slotCount?: number | null): string {
 if (!preferredDate || !preferredTime) {
 return '예약 일시 미입력';
 }

 const [hh, mm] = preferredTime.split(':');
 const h = Number(hh);
 const m = Number(mm);

 if (!Number.isFinite(h) || !Number.isFinite(m) || !durationMinutes || durationMinutes <= 0) {
 return `${preferredDate} ${preferredTime}`;
 }

 const startTotal = h * 60 + m;
 const endTotal = startTotal + durationMinutes;

 const endH = Math.floor(endTotal / 60) % 24;
 const endM = endTotal % 60;
 const endTimeStr = `${pad2(endH)}:${pad2(endM)}`;

 const baseRange = `${preferredDate} ${preferredTime} ~ ${endTimeStr}`;

 if (slotCount && slotCount > 0) {
 return `${baseRange} (${slotCount}슬롯 / 총 ${durationMinutes}분)`;
 }
 return `${baseRange} (총 ${durationMinutes}분)`;
}

export default async function StringServiceSuccessPage(props: Props) {
 const searchParams = await props.searchParams;
 const applicationId = searchParams.applicationId;

 if (!isValidObjectId(applicationId)) return notFound();

 // 비회원 주문/신청 차단 모드면, success 페이지도 로그인 필수로 막는다.
 // (applicationId/orderId/rentalId만으로 신청서/주문 정보가 렌더링되는 것을 DB 조회 전에 차단)
 const guestOrderMode = (process.env.GUEST_ORDER_MODE ?? process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
 const allowGuestCheckout = guestOrderMode === 'on';
 if (!allowGuestCheckout) {
 const token = (await cookies()).get('accessToken')?.value;
 const payload = safeVerifyAccessToken(token);
 if (!payload?.sub) {
 const qs = new URLSearchParams();
 qs.set('applicationId', String(applicationId));
 const next = `/services/success?${qs.toString()}`;
 return <LoginGate next={next} variant="checkout" />;
 }
 }

 const client = await clientPromise;
 const db = client.db();

 const application = await db.collection('stringing_applications').findOne({ _id: new ObjectId(applicationId) });

 // applicationId는 유효하지만, 실제 문서가 없으면 404 처리
 if (!application) return notFound();

 // 수거 방식 표준화
 const rawMethod = application?.shippingInfo?.collectionMethod ?? application?.collectionMethod ?? null; // (레거시 대비)
 const cm = normalizeCollection(typeof rawMethod === 'string' ? rawMethod : 'self_ship'); // 'visit' | 'self_ship' | 'courier_pickup'
 const isVisit = cm === 'visit';
 const isSelfShip = cm === 'self_ship';
 const isCourierPickup = cm === 'courier_pickup';

 // 방문 예약 희망 일시 라벨
 const visitTimeLabel = isVisit
 ? formatVisitTimeRange(application?.stringDetails?.preferredDate, application?.stringDetails?.preferredTime, (application as any)?.visitDurationMinutes ?? null, (application as any)?.visitSlotCount ?? null)
 : `예약 불필요${isSelfShip || isCourierPickup ? ' (자가발송/기사 수거)' : ''}`;

 // 패키지 정보 조회
 let appliedPass: any = null;
 if (application?.packageApplied && application?.packagePassId) {
 try {
 appliedPass = await db.collection('service_passes').findOne({ _id: new ObjectId(application.packagePassId) }, { projection: { remainingCount: 1, packageSize: 1, expiresAt: 1 } });
 } catch {}
 }

 // 여러 개 선택/커스텀 이름까지 합쳐 표시용 이름 랜더
 const stringTypes: string[] = application?.stringDetails?.stringTypes ?? [];

 const productIds = stringTypes.filter((id: string) => id && id !== 'custom' && ObjectId.isValid(id)).map((id: string) => new ObjectId(id));

 let stringNames: string[] = [];

 // products 컬렉션에서 name만
 if (productIds.length) {
 const prods = await db
 .collection('products')
 .find({ _id: { $in: productIds } }, { projection: { name: 1 } })
 .toArray();

 stringNames = prods.map((p: any) => p.name).filter(Boolean);
 }

 // 커스텀 이름이 포함되어 있다면 맨 앞에 붙임
 if (stringTypes.includes('custom') && application?.stringDetails?.customStringName) {
 stringNames.unshift(application.stringDetails.customStringName);
 }

 // 최종 표시 문자열 (여러 개면 " + "로 연결)
 const stringDisplay = stringNames.join(' + ') || '-';

 const racketLines = Array.isArray(application?.stringDetails?.racketLines) ? application.stringDetails.racketLines : [];

 // (통합결제) 주문 금액(라켓+스트링)까지 함께 보여주기 위한 주문 조회
 const orderObjectId = application.orderId && ObjectId.isValid(String(application.orderId)) ? new ObjectId(String(application.orderId)) : null;

 const order = orderObjectId ? await db.collection('orders').findOne({ _id: orderObjectId }) : null;

 // 합계 계산 유틸
 const sumBy = (items: any[], pred: (it: any) => boolean) => (items ?? []).filter(pred).reduce((acc, it) => acc + Number(it.price ?? 0) * Number(it.quantity ?? 1), 0);

 const racketSubtotal = order?.items ? sumBy(order.items, (it) => ['racket', 'used_racket'].includes(it.kind)) : 0;
 const stringSubtotal = order?.items ? sumBy(order.items, (it) => !['racket', 'used_racket'].includes(it.kind)) : 0;

 // 교체비(신청서 기준) — 패키지면 0
 const serviceSubtotal = application.packageApplied ? 0 : Number(application.totalPrice ?? 0);

 const combinedTotal = order ? racketSubtotal + stringSubtotal + serviceSubtotal : serviceSubtotal;

 // (대여 기반 신청서) rentalId가 있으면 대여 주문을 조회해서
 // 결제 요약을 '대여 결제 완료 금액' 기준으로 표시한다.
 const rentalIdStr = application.rentalId ? String(application.rentalId) : '';
 const rentalObjectId = ObjectId.isValid(rentalIdStr) ? new ObjectId(rentalIdStr) : null;
 const rental = rentalObjectId ? await db.collection('rental_orders').findOne({ _id: rentalObjectId }) : null;

 const rentalDeposit = rental ? Number(rental.amount?.deposit ?? 0) : 0;
 const rentalFee = rental ? Number(rental.amount?.fee ?? 0) : 0;
 const rentalStringPrice = rental ? Number(rental.amount?.stringPrice ?? 0) : 0;
 const rentalStringingFee = rental ? Number(rental.amount?.stringingFee ?? 0) : 0;
 const rentalTotal = rental ? Number(rental.amount?.total ?? rentalDeposit + rentalFee + rentalStringPrice + rentalStringingFee) : 0;

 const displayTotal = rental ? rentalTotal : Number(order ? combinedTotal : serviceSubtotal);

 // 무통장 입금 정보 우선순위:
 // 1) 대여 기반 신청서면 rental.payment 우선
 // 2) 통합결제(구매+서비스)면 order.payment/paymentInfo 우선
 // 3) 그 외에는 신청서 shippingInfo 기준
 const orderBankKey = (order as any)?.payment?.bank ?? (order as any)?.paymentInfo?.bank ?? null;
 const orderDepositor = (order as any)?.payment?.depositor ?? (order as any)?.paymentInfo?.depositor ?? null;

 const bankKey = rental?.payment?.bank ?? orderBankKey ?? application.shippingInfo?.bank ?? null;
 const depositor = rental?.payment?.depositor ?? orderDepositor ?? application.shippingInfo?.depositor ?? null; // 신청서에도 depositor가 있으면 보조
 const bankInfo = bankKey ? (bankLabelMap as any)[bankKey] : null;

 // 로그인 여부 확인
 const cookieStore = await cookies();
 const refreshToken = cookieStore.get('refreshToken')?.value;
 let isLoggedIn = false;
 if (refreshToken) {
 try {
 jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
 isLoggedIn = true;
 } catch {}
 }

 return (
 <>
 <BackButtonGuard />

 <div className="min-h-full bg-muted/30">
 <div className="relative overflow-hidden bg-muted/30 py-20">
 <div className="absolute inset-0 bg-overlay/20"></div>
 <HeroCourtBackdrop className="h-full w-full text-primary opacity-[0.10] dark:opacity-[0.12]" />
 <div className="absolute inset-0">
 <div className="absolute top-10 left-10 w-20 h-20 bg-card/10 rounded-full animate-pulse"></div>
 <div className="absolute top-32 right-20 w-16 h-16 bg-card/10 rounded-full animate-pulse delay-1000"></div>
 <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-card/10 rounded-full animate-pulse delay-500"></div>
 </div>

 <div className="relative container mx-auto px-4 text-center text-foreground">
 <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-card/20 backdrop-blur-sm mb-8">
 <CheckCircle className="h-12 w-12 text-primary" />
 </div>
 <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">신청이 완료되었습니다!</h1>
 <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">도깨비 테니스 아카데미에서 확인 후 빠르게 연락드리겠습니다</p>
 <div className="mt-8 inline-flex items-center space-x-2 bg-card/10 backdrop-blur-sm rounded-full px-6 py-3">
 <Calendar className="h-5 w-5" />
 <span className="text-sm font-medium">신청일: {new Date(application.createdAt).toLocaleDateString('ko-KR')}</span>
 </div>
 </div>

 {isSelfShip && (
 <div className="mt-10 max-w-2xl mx-auto px-4">
 <div className="bg-muted/30 backdrop-blur-sm border border-border rounded-xl p-6 text-center">
 <div className="flex items-center justify-center gap-3 mb-4">
 <div className="rounded-full border border-primary/20 bg-primary/10 p-2 text-primary dark:bg-primary/20">
 <Package className="h-6 w-6 text-primary" />
 </div>
 <h3 className="text-xl font-bold text-foreground">운송장 등록 안내</h3>
 </div>
 <p className="text-muted-foreground mb-4 leading-relaxed">
 <span className="font-semibold">라켓을 발송하신 뒤</span> 아래 버튼을 눌러 운송장을 등록해 주세요.
 <br />
 <span className="text-sm text-muted-foreground">(건너뛰고 마이페이지 → 신청내역 탭에서 등록도 가능합니다)</span>
 </p>
 <Button variant="default" className="font-semibold shadow-lg" asChild>
 <Link href={`/services/applications/${applicationId}/shipping`} className="flex items-center gap-2">
 운송장 등록하기
 <ArrowRight className="h-4 w-4" />
 </Link>
 </Button>
 </div>
 </div>
 )}
 </div>

 <div className="container mx-auto px-4 py-16">
 <div className="max-w-5xl mx-auto">
 <Card className="mb-8 backdrop-blur-sm bg-card/90 dark:bg-card border-0 shadow-2xl">
 <CardHeader className="bg-muted/30 rounded-t-lg">
 <div className="flex items-center justify-between">
 <div>
 <CardTitle className="text-2xl font-bold text-foreground flex items-center">
 <FileText className="h-6 w-6 mr-3 text-primary" />
 신청 정보
 </CardTitle>
 <CardDescription className="text-lg mt-2">
 신청 번호: <span className="font-mono font-semibold text-primary">{application._id.toString()}</span>
 </CardDescription>
 </div>
 <div className="text-right">
 <div className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm font-medium text-success dark:bg-success/15">
 <CheckCircle className="h-4 w-4 mr-2" />
 접수 완료
 </div>
 </div>
 </div>
 </CardHeader>

 <CardContent className="p-8">
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
 <div className="bg-muted p-6 rounded-xl">
 <div className="flex items-center mb-3">
 <Calendar className="h-6 w-6 text-primary mr-3" />
 <h3 className="font-semibold text-foreground">신청일자</h3>
 </div>
 <p className="text-2xl font-bold text-primary">{new Date(application.createdAt).toLocaleDateString('ko-KR')}</p>
 </div>

 <div className="bg-muted p-6 rounded-xl">
 <div className="flex items-center mb-3">
 <CreditCard className="h-6 w-6 text-primary mr-3" />
 <h3 className="font-semibold text-foreground">결제 요약</h3>
 </div>

 <p className="text-2xl font-bold text-primary">{Number(displayTotal).toLocaleString()}원</p>

 {/* order가 있으면 상세 breakdown 유지 */}
 {rental ? (
 <div className="space-y-3">
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">보증금</span>
 <span>{rentalDeposit.toLocaleString()}원</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">대여료</span>
 <span>{rentalFee.toLocaleString()}원</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">스트링 상품</span>
 <span>{rentalStringPrice.toLocaleString()}원</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">교체 서비스</span>
 <span>{rentalStringingFee.toLocaleString()}원</span>
 </div>
 <div className="flex justify-between items-center border-t pt-3">
 <span className="font-semibold">합계</span>
 <span className="font-semibold text-primary dark:text-success">{Number(displayTotal).toLocaleString()}원</span>
 </div>
 </div>
 ) : order ? (
 <p className="mt-2 text-sm text-muted-foreground">
 {[racketSubtotal > 0 ? `라켓 ${racketSubtotal.toLocaleString()}원` : null, stringSubtotal > 0 ? `스트링 ${stringSubtotal.toLocaleString()}원` : null, `교체비 ${serviceSubtotal.toLocaleString()}원`].filter(Boolean).join(' + ')}
 </p>
 ) : (
 <p className="mt-2 text-sm text-muted-foreground">교체 서비스 비용 기준</p>
 )}
 {application.packageApplied && <p className="mt-2 text-sm text-foreground">패키지 적용으로 입금 불필요</p>}
 </div>

 <div className="bg-muted p-6 rounded-xl">
 <div className="flex items-center mb-3">
 <Clock className="h-6 w-6 text-primary mr-3" />
 <h3 className="font-semibold text-foreground">희망 일시</h3>
 </div>
 <p className="text-lg font-bold text-primary">{visitTimeLabel}</p>
 </div>
 </div>
 {rental && (
 <div className="mb-8">
 <h3 className="text-xl font-bold text-foreground mb-4 flex items-center">
 <Package className="h-6 w-6 mr-3 text-primary" />
 대여 정보
 </h3>

 <div className="bg-muted/30 rounded-xl p-6 border-2 border-border">
 {/* 상단: 대여 번호 */}
 <div className="mb-4">
 <p className="text-sm text-muted-foreground">대여 번호</p>
 <p className="font-mono font-semibold text-primary">{String(rental._id)}</p>
 </div>

 {/* 라켓 정보 */}
 <div className="mb-6 bg-card p-4 rounded-lg shadow-sm">
 <p className="text-sm text-muted-foreground mb-1">대여 라켓</p>
 <p className="font-semibold text-foreground">{rental.brand ? `${racketBrandLabel(rental.brand)} ${rental.model ?? ''}` : '라켓 정보 없음'}</p>
 <div className="mt-2 flex items-center gap-2">
 <Badge className="border border-primary/20 bg-primary/10 text-primary dark:bg-primary/20">대여 {Number(rental.days ?? 0)}일</Badge>
 </div>
 </div>

 {/* 금액 breakdown: RentalsSuccessClient 구조 그대로 */}
 <div className="space-y-3">
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">대여 수수료</span>
 <span>{rentalFee.toLocaleString()}원</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">보증금</span>
 <span>{rentalDeposit.toLocaleString()}원</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">스트링 상품</span>
 <span>{rentalStringPrice.toLocaleString()}원</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">교체 서비스</span>
 <span>{rentalStringingFee.toLocaleString()}원</span>
 </div>

 <div className="bg-card p-4 rounded-xl border border-border mt-4">
 <div className="flex justify-between items-center font-bold">
 <span className="text-foreground">총 결제 금액</span>
 <span className="text-primary">{Number(displayTotal).toLocaleString()}원</span>
 </div>
 <p className="text-xs text-muted-foreground mt-1">* 반납 완료 후 보증금 환불 (연체/파손 시 차감)</p>
 </div>
 </div>
 </div>
 </div>
 )}

 {order && !rental && (
 <div className="mb-8">
 <h3 className="text-xl font-bold text-foreground mb-4 flex items-center">
 <Package className="h-6 w-6 mr-3 text-primary" />
 구매 정보
 </h3>

 <div className="bg-muted/30 rounded-xl p-6 border-2 border-border">
 {/* 상단: 주문 번호 */}
 <div className="mb-4">
 <p className="text-sm text-muted-foreground">주문 번호</p>
 <p className="font-mono font-semibold text-primary">{String(order._id)}</p>
 </div>

 {/* 금액 breakdown: 대여 카드 톤에 맞춰 동일 패턴 */}
 <div className="space-y-3">
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">라켓</span>
 <span>{Number(racketSubtotal).toLocaleString()}원</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">스트링</span>
 <span>{Number(stringSubtotal).toLocaleString()}원</span>
 </div>
 <div className="flex justify-between text-sm">
 <span className="text-muted-foreground">교체 서비스</span>
 <span>{Number(serviceSubtotal).toLocaleString()}원</span>
 </div>

 <div className="bg-card p-4 rounded-xl border border-border mt-4">
 <div className="flex justify-between items-center font-bold">
 <span className="text-foreground">총 결제 금액</span>
 <span className="text-primary">{Number(displayTotal).toLocaleString()}원</span>
 </div>
 <p className="text-xs text-muted-foreground mt-1">* 라켓/스트링/교체비 합산 기준</p>
 </div>
 </div>
 </div>
 </div>
 )}

 {application.packageApplied ? (
 // ===== 패키지 적용 카드 =====
 <div className="mb-8">
 <h3 className="text-xl font-bold text-foreground mb-4 flex items-center">
 <Ticket className="h-6 w-6 mr-3 text-primary" />
 패키지 적용됨
 </h3>

 <div className="rounded-xl p-6 border-2 border-border/70 bg-muted/30">
 <div className="flex items-start gap-4">
 <div className="grid h-10 w-10 shrink-0 place-content-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-sm dark:bg-primary/20">
 <Ticket className="h-5 w-5" />
 </div>

 <div className="flex-1">
 <div className="flex items-center gap-2">
 <span className="font-semibold text-primary">교체 패키지가 자동 적용되었습니다.</span>
 <Badge className="bg-primary/10 text-primary border border-primary/20 dark:bg-primary/20">입금 불필요</Badge>
 </div>

 <p className="mt-1 text-sm text-foreground">
 교체비는 <span className="font-semibold text-primary">0원</span> 으로 처리 됩니다.
 </p>

 {/* 잔여/만료 pill */}
 <div className="mt-3 flex flex-wrap gap-2">
 <Badge variant="outline" className="border-border text-primary">
 잔여 {appliedPass?.remainingCount ?? '-'}회
 </Badge>
 <Badge variant="outline" className="border-border text-primary">
 만료일 {appliedPass?.expiresAt ? new Date(appliedPass.expiresAt).toLocaleDateString('ko-KR') : '-'}
 </Badge>
 </div>

 {/* 잔여 게이지 */}
 {appliedPass?.packageSize
 ? (() => {
 const total = appliedPass.packageSize as number;
 const remaining = appliedPass.remainingCount as number;
 const used = Math.max(0, total - remaining);
 const remainPct = Math.round((remaining / total) * 100);
 return (
 <div className="mt-4">
 <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
 <span>
 총 {total}회 중 <span className="font-medium text-foreground">{used}</span>회 사용
 </span>
 <span className="tabular-nums">{remainPct}%</span>
 </div>
 <div className="h-2 w-full bg-primary/20 rounded-full overflow-hidden">
 <div className="h-full bg-primary" style={{ width: `${remainPct}%` }} />
 </div>
 <div className="mt-1 text-xs text-muted-foreground">
 잔여 <span className="font-medium text-primary">{remaining}</span>회
 </div>
 </div>
 );
 })()
 : null}
 </div>
 </div>
 </div>
 </div>
 ) : (
 // ===== 기존 입금 계좌 정보 (패키지 미적용 시에만 노출) =====
 bankInfo && (
 <div className="mb-8">
 <h3 className="text-xl font-bold text-foreground mb-4 flex items-center">
 <CreditCard className="h-6 w-6 mr-3 text-primary" />
 무통장 입금 안내
 </h3>

 <div className="bg-muted/30 rounded-xl p-6 border-2 border-border">
 <p className="text-sm text-muted-foreground mb-4">아래 계좌로 입금해 주세요. 입금 확인 후 결제완료로 상태가 변경됩니다.</p>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="bg-card p-4 rounded-lg shadow-sm">
 <p className="text-sm text-muted-foreground mb-1">은행</p>
 <p className="font-bold text-lg text-foreground">{bankInfo.label}</p>
 </div>
 <div className="bg-card p-4 rounded-lg shadow-sm">
 <p className="text-sm text-muted-foreground mb-1">계좌번호</p>
 <p className="font-mono font-bold text-lg text-foreground">{bankInfo.account}</p>
 </div>
 <div className="bg-card p-4 rounded-lg shadow-sm">
 <p className="text-sm text-muted-foreground mb-1">예금주</p>
 <p className="font-bold text-lg text-foreground">{bankInfo.holder}</p>
 </div>
 <div className="bg-card p-4 rounded-lg shadow-sm">
 <p className="text-sm text-muted-foreground mb-1">입금 금액</p>
 <p className="font-bold text-lg text-primary">{Number(displayTotal).toLocaleString()}원</p>
 </div>
 </div>

 {depositor && (
 <div className="mt-4 p-4 bg-card/70 dark:bg-card rounded-lg border border-border">
 <p className="text-sm text-muted-foreground mb-1">입금자명</p>
 <p className="font-semibold text-foreground">{String(depositor)}</p>
 </div>
 )}

 <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/30">
 <div className="flex items-center">
 <Zap className="h-5 w-5 text-destructive mr-2" />
 <p className="font-semibold text-destructive">입금 기한: {new Date(application.createdAt).toLocaleDateString('ko-KR')} 23:59까지</p>
 </div>
 </div>
 </div>
 </div>
 )
 )}

 <Separator className="my-8" />

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <div className="space-y-6">
 <h3 className="text-xl font-bold text-foreground flex items-center">
 <User className="h-6 w-6 mr-3 text-primary" />
 신청자 정보
 </h3>
 <div className="space-y-4">
 <div className="flex items-center p-4 bg-background dark:bg-card rounded-lg">
 <User className="h-5 w-5 text-muted-foreground mr-3" />
 <div>
 <p className="text-sm text-muted-foreground">이름</p>
 <p className="font-semibold text-foreground">{application.name}</p>
 </div>
 </div>
 <div className="flex items-center p-4 bg-background dark:bg-card rounded-lg">
 <Mail className="h-5 w-5 text-muted-foreground mr-3" />
 <div>
 <p className="text-sm text-muted-foreground">이메일</p>
 <p className="font-semibold text-foreground">{application.email}</p>
 </div>
 </div>
 <div className="flex items-center p-4 bg-background dark:bg-card rounded-lg">
 <Phone className="h-5 w-5 text-muted-foreground mr-3" />
 <div>
 <p className="text-sm text-muted-foreground">연락처</p>
 <p className="font-semibold text-foreground">{application.phone}</p>
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-6">
 <h3 className="text-xl font-bold text-foreground flex items-center">
 <MapPin className="h-6 w-6 mr-3 text-foreground" />
 배송지 정보
 </h3>
 <div className="space-y-4">
 <div className="p-4 bg-background dark:bg-card rounded-lg">
 <p className="text-sm text-muted-foreground mb-1">주소</p>
 <p className="font-semibold text-foreground">{application.shippingInfo?.address}</p>
 {application.shippingInfo?.addressDetail && <p className="text-foreground mt-1">{application.shippingInfo.addressDetail}</p>}
 </div>
 <div className="p-4 bg-background dark:bg-card rounded-lg">
 <p className="text-sm text-muted-foreground mb-1">우편번호</p>
 <p className="font-semibold text-foreground">{application.shippingInfo?.postalCode}</p>
 </div>
 </div>
 </div>
 </div>

 <Separator className="my-8" />

 <div className="space-y-6">
 <h3 className="text-xl font-bold text-foreground flex items-center">
 <Racquet className="h-6 w-6 mr-3 text-primary" />
 장착 정보
 </h3>
 {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="p-6 bg-muted rounded-xl">
 <div className="flex items-center mb-3">
 <Racquet className="h-5 w-5 text-primary mr-2" />
 <p className="text-sm font-medium text-muted-foreground">라켓</p>
 </div>
 <p className="font-bold text-lg text-foreground">{application.stringDetails.racketType}</p>
 </div>
 <div className="p-6 bg-muted rounded-xl">
 <div className="flex items-center mb-3">
 <p className="text-sm font-medium text-muted-foreground">스트링</p>
 </div>
 <p className="font-bold text-lg text-foreground">{stringDisplay}</p>
 </div>
 </div> */}

 {application.stringDetails.requirements && (
 <div className="p-6 bg-muted rounded-xl">
 <div className="flex items-start mb-3">
 <FileText className="h-5 w-5 text-primary mr-2 mt-0.5" />
 <p className="text-sm font-medium text-muted-foreground">요청사항</p>
 </div>
 <p className="text-foreground leading-relaxed">{application.stringDetails.requirements}</p>
 </div>
 )}
 </div>
 {/* 기존 장착 정보 카드 아래 쪽에 추가 */}
 {racketLines.length > 0 && (
 <div className="mt-8">
 <h4 className="text-lg font-semibold text-foreground mb-3">라켓별 세부 장착 정보</h4>

 <div className="space-y-3">
 {racketLines.map((line: any, idx: number) => (
 <div key={line.id ?? idx} className="p-4 rounded-lg bg-background dark:bg-card flex flex-col md:flex-row md:items-center md:justify-between gap-3">
 <div>
 <p className="text-xs text-muted-foreground mb-1">라켓 {line.racketType || line.racketLabel || `${idx + 1}번`}</p>

 {line.stringName && <p className="font-semibold text-foreground">스트링: {line.stringName}</p>}
 </div>

 <div className="text-sm text-foreground text-right">
 {(line.tensionMain || line.tensionCross) && (
 <p>
 텐션&nbsp;
 <span className="font-medium">
 메인 {line.tensionMain || '-'} / 크로스 {line.tensionCross || '-'}
 </span>
 </p>
 )}
 {line.note && <p className="mt-1 text-xs text-muted-foreground">메모: {line.note}</p>}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </CardContent>

 <CardFooter className="bg-background dark:bg-card rounded-b-lg p-8">
 <div className="flex flex-col sm:flex-row gap-4 w-full">
 <Button variant="default" className="flex-1 h-12 transition-all duration-200" asChild>
 <Link href={`/mypage?${new URLSearchParams({ tab: 'applications', id: String(application._id) }).toString()}`}>
 <FileText className="h-5 w-5 mr-2" />
 신청 내역 보기
 </Link>
 </Button>
 <Button variant="outline" className="flex-1 h-12 transition-colors duration-200" asChild>
 <Link href="/">
 <Home className="h-5 w-5 mr-2" />
 홈으로 돌아가기
 </Link>
 </Button>
 </div>
 </CardFooter>
 </Card>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
 <Card className="backdrop-blur-sm bg-card/90 dark:bg-card border-0 shadow-xl">
 <CardHeader>
 <CardTitle className="flex items-center text-lg">
 <Shield className="h-6 w-6 mr-3 text-primary" />
 신청 안내사항
 </CardTitle>
 </CardHeader>
 <CardContent>
 <ul className="space-y-3">
 <li className="flex items-start">
 <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
 <span className="text-foreground">신청 정보를 정확히 입력했는지 다시 확인해주세요.</span>
 </li>
 <li className="flex items-start">
 <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
 <span className="text-foreground">신청서에 따라 장착 담당자가 확인 후 연락드릴 예정입니다.</span>
 </li>
 <li className="flex items-start">
 <CheckCircle className="h-5 w-5 text-primary mr-3 mt-0.5 flex-shrink-0" />
 <span className="text-foreground">문의 사항은 고객센터(02-1234-5678)로 연락 주세요.</span>
 </li>
 </ul>
 </CardContent>
 </Card>

 <Card className="backdrop-blur-sm bg-card/90 dark:bg-card border-0 shadow-xl">
 <CardHeader>
 <CardTitle className="flex items-center text-lg">
 <Award className="h-6 w-6 mr-3 text-foreground" />
 서비스 특징
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 <div className="flex items-center p-3 bg-primary/10 border border-primary/20 dark:bg-primary/20 rounded-lg">
 <Shield className="h-6 w-6 text-primary mr-3" />
 <div>
 <p className="font-semibold text-foreground">정품 보장</p>
 <p className="text-sm text-muted-foreground">100% 정품 스트링만 사용</p>
 </div>
 </div>
 <div className="flex items-center p-3 bg-muted dark:bg-card rounded-lg">
 <Clock className="h-6 w-6 text-foreground mr-3" />
 <div>
 <p className="font-semibold text-foreground">철저한 예약 장착 완료</p>
 <p className="text-sm text-muted-foreground">빠르고 정확한 장착 서비스</p>
 </div>
 </div>
 <div className="flex items-center p-3 bg-primary/10 border border-primary/20 dark:bg-primary/20 rounded-lg">
 <Award className="h-6 w-6 text-foreground mr-3" />
 <div>
 <p className="font-semibold text-foreground">전문가 상담</p>
 <p className="text-sm text-muted-foreground">전문가가 직접 상담</p>
 </div>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </div>
 </div>
 </>
 );
}
