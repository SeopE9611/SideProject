import RentalsSuccessClient from '@/app/rentals/success/_components/RentalsSuccessClient';
import LoginGate from '@/components/system/LoginGate';
import { verifyAccessToken, verifyOrderAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

type SuccessSearchParams = {
  id?: string;
  withService?: string;
  stringingSubmitted?: string;
  stringingApplicationId?: string;
};

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

function safeVerifyOrderAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyOrderAccessToken(token) as { orderId?: string; rentalId?: string } | null;
  } catch {
    return null;
  }
}


function getApplicationLines(stringDetails: any): any[] {
  if (Array.isArray(stringDetails?.lines)) return stringDetails.lines;
  if (Array.isArray(stringDetails?.racketLines)) return stringDetails.racketLines;
  return [];
}

function getReceptionLabel(collectionMethod?: string | null): string {
  if (collectionMethod === 'visit') return '방문 접수';
  if (collectionMethod === 'courier_pickup') return '기사 방문 수거';
  return '발송 접수';
}

async function getData(db: any, id: string, r: any) {
  const rk = await db.collection('used_rackets').findOne({ _id: r.racketId });
  const period = r.days ?? r.period ?? 0;
  const fee = r.amount?.fee ?? r.fee ?? 0;
  const deposit = r.amount?.deposit ?? r.deposit ?? 0;
  const stringPrice = r.amount?.stringPrice ?? 0;
  const stringingFee = r.amount?.stringingFee ?? 0;
  const total = r.amount?.total ?? fee + deposit + stringPrice + stringingFee;

  const appId = (r as any)?.stringingApplicationId ? String((r as any).stringingApplicationId) : null;
  let applicationSummary = null;
  if (appId && ObjectId.isValid(appId)) {
    const app = await db.collection('stringing_applications').findOne(
      { _id: new ObjectId(appId) },
      { projection: { stringDetails: 1, collectionMethod: 1, status: 1 } },
    );
    if (app) {
      const lines = getApplicationLines((app as any).stringDetails);
      const stringNames = Array.from(new Set(lines.map((line: any) => String(line?.stringName ?? '').trim()).filter(Boolean)));
      const tensionSet = Array.from(
        new Set(
          lines
            .map((line: any) => {
              const main = String(line?.tensionMain ?? '').trim();
              const cross = String(line?.tensionCross ?? '').trim();
              if (!main && !cross) return '';
              return cross && cross !== main ? `${main}/${cross}` : main || cross;
            })
            .filter(Boolean),
        ),
      );
      const preferredDate = String((app as any)?.stringDetails?.preferredDate ?? '').trim();
      const preferredTime = String((app as any)?.stringDetails?.preferredTime ?? '').trim();

      applicationSummary = {
        status: String((app as any)?.status ?? '접수완료'),
        lineCount: lines.length,
        stringNames,
        tensionSummary: tensionSet.length ? tensionSet.join(', ') : null,
        receptionLabel: getReceptionLabel((app as any).collectionMethod),
        reservationLabel: preferredDate && preferredTime ? `${preferredDate} ${preferredTime}` : null,
      };
    }
  }

  return {
    id,
    period,
    fee,
    deposit,
    stringPrice,
    stringingFee,
    total,
    status: r.status,
    withStringService: Boolean((r as any)?.stringing?.requested) || Boolean((r as any)?.isStringServiceApplied) || Boolean((r as any)?.stringingApplicationId),
    isStringServiceApplied: Boolean((r as any)?.isStringServiceApplied),
    stringingApplicationId: appId,
    applicationSummary,
    racket: rk ? { brand: rk.brand, model: rk.model, condition: rk.condition } : null,
    payment: r.payment
      ? {
          method: r.payment.method || 'bank',
          bank: r.payment.bank || null,
          depositor: r.payment.depositor || null,
        }
      : null,
    refundAccount: r.refundAccount
      ? {
          bank: r.refundAccount.bank || null,
          holder: r.refundAccount.holder || null,
          account: r.refundAccount.account || null,
        }
      : null,
  };
}

function parseBooleanHint(value?: string): boolean | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'y', 'yes'].includes(normalized)) return true;
  if (['0', 'false', 'n', 'no'].includes(normalized)) return false;
  return null;
}

export default async function Page({ searchParams }: { searchParams: Promise<SuccessSearchParams> }) {
  const { id, withService, stringingSubmitted, stringingApplicationId } = await searchParams;
  if (!id || !ObjectId.isValid(id)) return notFound();

  // 비회원 주문(대여) 차단 모드면, success 페이지도 로그인 필수로 막는다.
  // (id만으로 대여/환불계좌 등의 정보가 렌더링될 수 있으므로 DB 조회 전에 차단)
  const guestOrderMode = (process.env.GUEST_ORDER_MODE ?? process.env.NEXT_PUBLIC_GUEST_ORDER_MODE ?? 'legacy').trim();
  const allowGuestCheckout = guestOrderMode === 'on';

  if (!allowGuestCheckout) {
    const token = (await cookies()).get('accessToken')?.value;
    const payload = safeVerifyAccessToken(token);
    if (!payload?.sub) {
      const qs = new URLSearchParams();
      qs.set('id', id);
      const next = `/rentals/success?${qs.toString()}`;
      return <LoginGate next={next} variant="checkout" />;
    }
  }
  const db = (await clientPromise).db();
  const rental = await db.collection('rental_orders').findOne({ _id: new ObjectId(id) });
  if (!rental) return notFound();

  const cookieStore = await cookies();
  const accessPayload = safeVerifyAccessToken(cookieStore.get('accessToken')?.value);
  const orderAccessPayload = safeVerifyOrderAccessToken(cookieStore.get('orderAccessToken')?.value);

  const ownerUserId = rental.userId ? String(rental.userId) : null;
  const rentalOrderId = rental.orderId ? String(rental.orderId) : null;
  const isMemberOwner = !!(accessPayload?.sub && ownerUserId && accessPayload.sub === ownerUserId);
  const isGuestOwner = !!(
    orderAccessPayload &&
    ((orderAccessPayload.orderId && (orderAccessPayload.orderId === rentalOrderId || orderAccessPayload.orderId === String(rental._id))) ||
      (orderAccessPayload.rentalId && orderAccessPayload.rentalId === String(rental._id)))
  );

  if (!isMemberOwner && !isGuestOwner) return notFound();

  const data = await getData(db, id, rental);
  return (
    <RentalsSuccessClient
      data={{
        ...data,
        queryHint: {
          withService: parseBooleanHint(withService),
          stringingSubmitted: parseBooleanHint(stringingSubmitted),
          stringingApplicationId: stringingApplicationId ? String(stringingApplicationId) : null,
        },
      }}
    />
  );
}
