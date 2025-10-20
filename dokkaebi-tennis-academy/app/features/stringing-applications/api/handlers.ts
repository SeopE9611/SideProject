import { NextRequest, NextResponse } from 'next/server';
import clientPromise, { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { HistoryItem, HistoryRecord } from '@/lib/types/stringing-application-db';
import { cookies } from 'next/headers';
import { verifyAccessToken, verifyOrderAccessToken } from '@/lib/auth.utils';
import { getStringingServicePrice } from '@/lib/stringing-prices';
import { OrderItem } from '@/lib/types/order';
import { normalizeEmail } from '@/lib/claims';
import { consumePass, findOneActivePassForUser } from '@/lib/passes.service';
import { onApplicationSubmitted, onStatusUpdated, onScheduleConfirmed, onScheduleUpdated, onApplicationCanceled, onScheduleCanceled } from '@/app/features/notifications/triggers/stringing';
import { calcStringingTotal } from '@/lib/pricing';

// 진행(점유)으로 간주하는 상태들 — 프로젝트 정책에 맞게 조정 가능
// '교체완료'는 점유 해제로 본다는 가정(완료 후 새 신청 허용).
export const INPROGRESS_STATUSES = ['draft', '검토 중', '접수완료', '작업 중'] as const;

// 간단 정규화 헬퍼
const normalizeCollection = (v: any): 'self_ship' | 'courier_pickup' | 'visit' => {
  const s = String(v || '').toLowerCase();
  if (s === 'self_send' || s === 'self-ship' || s === 'self_ship') return 'self_ship';
  if (s === 'courier_pickup' || s === 'courier-pickup' || s === 'courier' || s === 'pickup') return 'courier_pickup';
  if (s === 'visit' || s === '방문' || s === '매장') return 'visit';
  return 'self_ship';
};

const norm = (v: any): 'self_ship' | 'courier_pickup' | 'visit' => {
  const s = String(v || '').toLowerCase();
  if (s === 'self_send' || s === 'self-ship' || s === 'self_ship') return 'self_ship';
  if (s === 'courier_pickup' || s === 'courier-pickup' || s === 'courier' || s === 'pickup') return 'courier_pickup';
  if (s === 'visit' || s === '방문' || s === '매장') return 'visit';
  return 'self_ship';
};

// ================= GET (단일 신청서 조회) =================
export async function handleGetStringingApplication(req: Request, id: string) {
  const client = await clientPromise;
  const db = await getDb();

  try {
    // 단일 조회 핸들러의 id 검사
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const app = await db.collection('stringing_applications').findOne({ _id: new ObjectId(id) });
    if (!app) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 상품 ID 배열을 실제 상품명과 매핑
    const stringItems = await Promise.all(
      (app.stringDetails?.stringTypes || []).map(async (prodId: string) => {
        if (prodId === 'custom') {
          return {
            id: 'custom',
            name: app.stringDetails.customStringName ?? '커스텀 스트링',
          };
        }
        const prod = await db.collection('products').findOne({ _id: new ObjectId(prodId) }, { projection: { name: 1 } });
        return {
          id: prodId,
          name: prod?.name ?? '알 수 없는 상품',
        };
      })
    );

    //  items 배열 재구성 (id, name, price, quantity)
    const items = await Promise.all(
      stringItems.map(async (item) => {
        if (item.id === 'custom') {
          return {
            id: 'custom',
            name: item.name,
            price: getStringingServicePrice(item.id, true), // 커스텀 요금
            quantity: 1,
          };
        }
        const prod = await db.collection('products').findOne({ _id: new ObjectId(item.id) }, { projection: { mountingFee: 1 } });
        return {
          id: item.id,
          name: item.name,
          price: prod?.mountingFee ?? getStringingServicePrice(item.id, false),
          quantity: 1,
        };
      })
    );

    // total 계산
    const total = items.reduce((sum, x) => sum + x.price * x.quantity, 0);

    // 주문 조회 전에 orderId가 없을 수 있는 경우 방어
    let order: any = null;
    if (app.orderId && ObjectId.isValid(app.orderId)) {
      order = await db.collection('orders').findOne({ _id: new ObjectId(app.orderId) }, { projection: { items: 1 } });
    }

    const rawOrderItems = (order?.items ?? []) as { productId: string; quantity: number }[];

    const orderStrings = await Promise.all(
      rawOrderItems.map(async (oi) => {
        const prod = await db.collection('products').findOne({ _id: new ObjectId(oi.productId) }, { projection: { name: 1, mountingFee: 1 } });
        return {
          id: oi.productId,
          name: prod?.name ?? '알 수 없는 상품',
          mountingFee: prod?.mountingFee ?? 0,
        };
      })
    );

    // 체크박스 옵션으로 그대로 사용
    const purchasedStrings = orderStrings;
    const sd = app.stringDetails || {};
    return NextResponse.json({
      id: app._id.toString(),
      orderId: app.orderId?.toString() || null,
      customer: {
        name: app.customer?.name ?? app.userSnapshot?.name ?? app.guestName ?? '-',
        email: app.customer?.email ?? app.userSnapshot?.email ?? app.guestEmail ?? '-',
        phone: app.customer?.phone ?? app.shippingInfo?.phone ?? app.guestPhone ?? '',
        address: app.customer?.address ?? app.shippingInfo?.address ?? '',
        addressDetail: app.customer?.addressDetail ?? app.shippingInfo?.addressDetail ?? '',
        postalCode: app.customer?.postalCode ?? app.shippingInfo?.postalCode ?? '',
      },
      requestedAt: app.createdAt,
      desiredDateTime: app.desiredDateTime,
      status: app.status,
      paymentStatus: app.paymentStatus,
      shippingInfo: app.shippingInfo || null,
      collectionMethod: normalizeCollection(app.collectionMethod ?? app.shippingInfo?.collectionMethod ?? 'self_ship'),
      memo: app.memo || '',
      photos: app.photos || [],
      stringDetails: {
        racketType: sd.racketType ?? '',
        preferredDate: sd.preferredDate ?? '',
        preferredTime: sd.preferredTime ?? '',
        requirements: sd.requirements ?? '',
        stringTypes: Array.isArray(sd.stringTypes) ? sd.stringTypes : [],
        stringItems,
        ...(sd.customStringName ? { customStringName: sd.customStringName } : {}),
      },
      items,
      total,
      totalPrice: app.totalPrice ?? 0,
      history: (app.history ?? []).map((record: HistoryRecord) => ({
        status: record.status,
        date: record.date,
        description: record.description,
      })),
      purchasedStrings,
      orderStrings,
    });
  } catch (e) {
    console.error('[GET stringing_application]', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ================= PATCH (관리자용 수정) =================
export async function handlePatchStringingApplication(req: Request, id: string) {
  const client = await clientPromise;
  const db = await getDb();
  const { name, email, phone, address, addressDetail, postalCode, depositor, stringDetails } = await req.json();

  const app = await db.collection('stringing_applications').findOne({ _id: new ObjectId(id) });
  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  const appDoc = app as NonNullable<typeof app>;

  const setFields: any = {};
  const pushHistory: any[] = [];

  const updatePayload = { name, email, phone, address, addressDetail, postalCode, depositor, stringDetails };
  const updatedTypes: string[] = (updatePayload?.stringDetails?.stringTypes ?? app.stringDetails?.stringTypes ?? []) as string[];

  // const recalculated = await calcStringingTotal(db, updatedTypes);
  // setFields.totalPrice = recalculated;

  // PATCH 이전(현재) 문서에 예약 일정이 있었는지 기록
  const hadScheduleBefore = Boolean(appDoc?.stringDetails?.preferredDate) && Boolean(appDoc?.stringDetails?.preferredTime);

  // 고객정보 변경
  if (name || email || phone || address || addressDetail || postalCode) {
    // 기존 customer 병합
    const baseCustomer = appDoc.customer ?? {
      name: appDoc.userSnapshot?.name ?? appDoc.guestName ?? '',
      email: appDoc.userSnapshot?.email ?? appDoc.guestEmail ?? '',
      phone: appDoc.guestPhone ?? appDoc.shippingInfo?.phone ?? '',
      address: appDoc.shippingInfo?.address ?? '',
      addressDetail: appDoc.shippingInfo?.addressDetail ?? '',
      postalCode: appDoc.shippingInfo?.postalCode ?? '',
    };
    setFields.customer = {
      ...baseCustomer,
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
      ...(phone ? { phone } : {}),
      ...(address ? { address } : {}),
      ...(addressDetail ? { addressDetail } : {}),
      ...(postalCode ? { postalCode } : {}),
    };
    pushHistory.push({
      status: '고객정보수정',
      date: new Date(),
      description: '고객 정보를 수정했습니다.',
    });
  }

  // 결제정보 변경
  if (depositor !== undefined) {
    setFields['shippingInfo.depositor'] = depositor;
    pushHistory.push({
      status: '입금자명 수정',
      date: new Date(),
      description: `입금자명을 "${depositor}"(으)로 수정했습니다.`,
    });
  }

  // 스트링 세부정보 변경
  let hasTimeChange = false; //
  if (stringDetails) {
    //  스트링 관련 필드 변경 감지
    hasTimeChange = typeof stringDetails.desiredDateTime !== 'undefined';
    const hasTypesChange = Array.isArray(stringDetails.stringTypes);
    const hasCustomNameChange = 'customStringName' in stringDetails;
    const hasRacketChange = typeof stringDetails.racketType !== 'undefined';

    // 날짜/시간
    if (hasTimeChange) {
      const [date, time] = String(stringDetails.desiredDateTime ?? '').split('T');
      if (date && time) {
        setFields['stringDetails.preferredDate'] = date;
        setFields['stringDetails.preferredTime'] = time;
        setFields.desiredDateTime = stringDetails.desiredDateTime;
      }
    }

    // 스트링 타입 & 커스텀 이름
    if (hasTypesChange) {
      const prevTypes: string[] = Array.isArray(appDoc?.stringDetails?.stringTypes) ? appDoc.stringDetails.stringTypes : []; //
      const types: string[] = Array.isArray(stringDetails.stringTypes) ? stringDetails.stringTypes : prevTypes;
      setFields['stringDetails.stringTypes'] = types;
      setFields['stringDetails.customStringName'] = stringDetails.customStringName ?? null;
    }

    // 라켓 종류
    if (hasRacketChange) {
      setFields['stringDetails.racketType'] = stringDetails.racketType;
    }

    // stringItems 재계산
    if (hasTimeChange || hasTypesChange || hasCustomNameChange) {
      const typesForItems: string[] = Array.isArray(stringDetails?.stringTypes) ? stringDetails.stringTypes : Array.isArray(appDoc?.stringDetails?.stringTypes) ? appDoc.stringDetails.stringTypes : [];
      const newItems = await Promise.all(
        typesForItems.map(async (prodId: any) => {
          if (prodId === 'custom') {
            return {
              id: 'custom',
              name: stringDetails?.customStringName?.trim() || appDoc?.stringDetails?.customStringName || '커스텀 스트링',
              price: getStringingServicePrice('custom', true), //   커스텀도 price 포함
              quantity: 1, //
            };
          }
          const prod = await db.collection('products').findOne({ _id: new ObjectId(prodId) }, { projection: { name: 1, mountingFee: 1 } });
          return {
            id: prodId,
            name: prod?.name ?? '알 수 없는 상품',
            price: prod?.mountingFee ?? getStringingServicePrice(prodId, false),
            quantity: 1, //
          };
        })
      );
      setFields['stringDetails.stringItems'] = newItems;

      // 스트링 요금(newItems) 합산하여 totalPrice 자동 설정
      // 유틸 기준으로 최종 금액 1회 확정
      if (hasTypesChange || hasCustomNameChange) {
        const typesForTotal: string[] = Array.isArray(setFields['stringDetails.stringTypes']) ? setFields['stringDetails.stringTypes'] : appDoc.stringDetails?.stringTypes ?? [];

        const recalculated = await calcStringingTotal(db, typesForTotal);
        setFields.totalPrice = recalculated;
        pushHistory.push({
          status: '결제 금액 자동 업데이트',
          date: new Date(),
          description: `결제 금액을 ${recalculated.toLocaleString()}원으로 업데이트했습니다. (정산 유틸)`,
        });
      }
    }
    if (hasTimeChange || hasTypesChange || hasCustomNameChange || hasRacketChange) {
      pushHistory.push({
        status: '스트링 정보 수정',
        date: new Date(),
        description: '스트링 세부 정보를 수정했습니다.',
      });
    }

    if (typeof stringDetails.requirements !== 'undefined' && stringDetails.requirements !== appDoc.stringDetails?.requirements) {
      setFields['stringDetails.requirements'] = stringDetails.requirements;
      pushHistory.push({
        status: '요청사항 수정',
        date: new Date(),
        description: '요청사항을 수정했습니다.',
      });
    }
  }

  // 실제 업데이트
  const result = await db.collection('stringing_applications').updateOne({ _id: new ObjectId(id) }, {
    $set: setFields,
    $push: { history: { $each: pushHistory } },
  } as any);

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  // 동기화: 연결된 일반 주문서가 있으면 고객 정보 / 입금자명 반영
  if (appDoc.orderId && ObjectId.isValid(appDoc.orderId)) {
    const ordersColl = db.collection('orders');
    const order = await ordersColl.findOne({ _id: new ObjectId(appDoc.orderId) });
    if (order) {
      // 고객 정보 동기화
      if (setFields.customer) {
        await ordersColl.updateOne({ _id: new ObjectId(appDoc.orderId) }, {
          $set: {
            customer: {
              ...((order as any).customer ?? {}),
              name: setFields.customer.name,
              email: setFields.customer.email,
              phone: setFields.customer.phone,
              address: setFields.customer.address,
              addressDetail: setFields.customer.addressDetail ?? '',
              postalCode: setFields.customer.postalCode,
            },
          },
          $push: {
            history: {
              status: '고객정보수정(동기화)',
              date: new Date(),
              description: '스트링 신청서에서 고객 정보를 동기화했습니다.',
            },
          },
        } as any);
      }

      // 입금자명(depositor) 동기화 (스트링 신청서에서 변경된 경우)
      if (typeof depositor !== 'undefined') {
        await ordersColl.updateOne({ _id: new ObjectId(appDoc.orderId) }, {
          $set: { 'shippingInfo.depositor': depositor },
          $push: {
            history: {
              status: '입금자명 수정(동기화)',
              date: new Date(),
              description: '스트링 신청서에서 입금자명을 동기화했습니다.',
            },
          },
        } as any);
      }
    }
  }

  // [교체] 예약 일시가 변경된 경우에만 알림 전송(상태 기반으로 확정/변경 분기)
  if (hasTimeChange) {
    const appAfter = await db.collection('stringing_applications').findOne({ _id: new ObjectId(id) });
    if (appAfter) {
      const STATUS_VALUES = ['draft', '검토 중', '접수완료', '작업 중', '교체완료', '취소'] as const; //
      type AppStatus = (typeof STATUS_VALUES)[number]; //
      const toAppStatus = (s: string): AppStatus | null => ((STATUS_VALUES as readonly string[]).includes(s) ? (s as AppStatus) : null); //

      const userCtx = {
        name: appAfter?.customer?.name ?? appAfter?.userSnapshot?.name ?? appAfter?.guestName ?? undefined,
        email: appAfter?.customer?.email ?? appAfter?.userSnapshot?.email ?? appAfter?.guestEmail,
      };
      const appStatus: AppStatus = toAppStatus(appAfter.status ?? '') ?? '검토 중'; //
      const appCtx = {
        applicationId: String(appAfter._id),
        orderId: appAfter?.orderId ? String(appAfter.orderId) : null,
        status: appStatus,
        stringDetails: appAfter?.stringDetails,
        shippingInfo: appAfter?.shippingInfo,
      };

      // 규칙:
      // - 접수완료가 아니면 → '예약 변경 안내'
      // - 접수완료면서 이전 일정이 없었으면 → '예약 확정 안내'
      // - 접수완료면서 이전 일정이 있었으면 → '예약 변경 안내'
      if (appStatus !== '접수완료') {
        await onScheduleUpdated({ user: userCtx, application: appCtx }); //
      } else {
        // 이전 일정 존재 여부 판단을 위해 PATCH 전에 계산한 hadScheduleBefore를 사용
        if (!hadScheduleBefore) await onScheduleConfirmed({ user: userCtx, application: appCtx }); //
        else await onScheduleUpdated({ user: userCtx, application: appCtx }); //
      }
    }
  }

  return NextResponse.json({ success: true });
}

// ========== 신청서의 상태 업데이트 ==========
export async function handleUpdateApplicationStatus(req: Request, context: { params: { id: string } }) {
  // 쿠키에서 accessToken 추출
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return new NextResponse('Unauthorized', { status: 401 }); // 토큰 없으면 인증 실패

  // accessToken 유효성 검증
  const payload = verifyAccessToken(token);
  if (!payload) return new NextResponse('Unauthorized', { status: 401 }); // 토큰이 변조되었거나 만료됨

  // URL 파라미터로부터 신청 ID 추출
  const { id } = context.params;
  if (!ObjectId.isValid(id)) return new NextResponse('Invalid ID', { status: 400 }); // MongoDB ObjectId 형식 검증

  // 요청 본문에서 status 값 추출
  const { status: statusStr } = await req.json(); //   변수명 명확화
  if (!statusStr || typeof statusStr !== 'string') {
    return NextResponse.json({ error: '상태값 누락 또는 형식 오류' }, { status: 400 });
  }

  //   상태 유니온 타입 보장
  const STATUS_VALUES = ['draft', '검토 중', '접수완료', '작업 중', '교체완료', '취소'] as const; //
  type AppStatus = (typeof STATUS_VALUES)[number]; //
  const toAppStatus = (s: string): AppStatus | null => ((STATUS_VALUES as readonly string[]).includes(s) ? (s as AppStatus) : null); //
  const status = toAppStatus(statusStr); //
  if (!status) {
    //
    return NextResponse.json({ error: '허용되지 않는 상태값입니다.' }, { status: 400 });
  } //

  // MongoDB 연결
  const client = await clientPromise;
  const db = await getDb();

  // description 따로 준비
  const description = `신청서 상태가 [${status}]로 변경되었습니다.`;

  // historyEntry 객체 구성
  const historyEntry = {
    status,
    date: new Date(),
    description,
  };

  // 상태 + 이력 함께 업데이트
  const updateOps: any = {
    $set: { status },
    $push: { history: { $each: [historyEntry] } },
  };

  // draft가 아니면 TTL 필드 제거(삭제 대상에서 제외)
  if (status !== 'draft') {
    updateOps.$unset = { expireAt: '' };
  }

  const result = await db.collection('stringing_applications').updateOne({ _id: new ObjectId(id) }, updateOps);

  // 신청서를 찾지 못했을 경우
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: '신청서를 찾을 수 없습니다.' }, { status: 404 });
  }

  //   공통 컨텍스트 구성 (아래 분기들에서 재사용)
  const appDoc = await db.collection('stringing_applications').findOne({ _id: new ObjectId(id) }); //
  if (!appDoc) {
    //
    return NextResponse.json({ error: '신청서를 찾을 수 없습니다.' }, { status: 404 }); //
  } //

  const userCtx = {
    //
    name: appDoc?.customer?.name ?? appDoc?.userSnapshot?.name ?? appDoc?.guestName ?? undefined,
    email: appDoc?.customer?.email ?? appDoc?.userSnapshot?.email ?? appDoc?.guestEmail,
  };

  const appCtx = {
    //
    applicationId: id,
    orderId: appDoc?.orderId ? String(appDoc.orderId) : null,
    status, // 위에서 유효성 보장된 유니온
    stringDetails: appDoc?.stringDetails,
    shippingInfo: appDoc?.shippingInfo,
  };

  const adminDetailUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/admin/applications/stringing/${id}`; //

  //   알림: 상태 변경 (사용자 메일 + 운영자 슬랙)
  if (status !== '취소') {
    await onStatusUpdated({ user: userCtx, application: appCtx, adminDetailUrl });
  }
  // '접수완료'로 바뀌었고 일정이 있으면 → 예약 확정 안내(ICS)
  if (status === '접수완료') {
    //
    const hasSchedule = Boolean(appDoc?.stringDetails?.preferredDate) && Boolean(appDoc?.stringDetails?.preferredTime);
    if (hasSchedule) {
      await onScheduleConfirmed({ user: userCtx, application: appCtx }); //
    }
  }

  // '취소'로 바뀌었을 때 → "신청 취소 안내" 한 통만 발송하고 종료
  if (status === '취소') {
    await onApplicationCanceled({ user: userCtx, application: appCtx }); // 신청 취소 안내 한 통만

    // 상태 업데이트 메일은 생략 (이미 위에서 status !== '취소' 조건으로 막혀있음)
    return NextResponse.json({ success: true }); // 조기 종료: 아래 로직으로 안 내려가게
  }
  //  정상 처리 시 성공 응답 반환
  return NextResponse.json({ success: true });
}

// ========== 배송 정보 수정 (스트링 신청서 + 연결된 주문서) ==========
export async function handleUpdateShippingInfo(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const db = await getDb();
    const app = await db.collection('stringing_applications').findOne({ _id: new ObjectId(id) });
    if (!app) return new NextResponse('신청서를 찾을 수 없습니다.', { status: 404 });

    const newShippingInfo = body.shippingInfo;
    if (!newShippingInfo) return new NextResponse('배송 정보가 필요합니다.', { status: 400 });

    // 1) 기존 배송 정보와 병합
    const mergedShippingInfo = { ...app.shippingInfo, ...newShippingInfo };

    // 2) 업데이트 필드 구성
    const setFields: any = { shippingInfo: mergedShippingInfo };

    if (typeof newShippingInfo.collectionMethod === 'string') {
      const normalized = norm(newShippingInfo.collectionMethod);
      newShippingInfo.collectionMethod = normalized; // shippingInfo 내부도 정규화
      setFields.collectionMethod = normalized; // 최상위 필드도 동일하게 유지
    }

    // 3) 신청서 업데이트
    await db.collection('stringing_applications').updateOne({ _id: new ObjectId(id) }, { $set: setFields });

    // 4) 연결된 주문에도 동일 병합
    if (app.orderId) {
      const order = await db.collection('orders').findOne({ _id: new ObjectId(app.orderId) });
      const orderShipping = order?.shippingInfo || {};
      const mergedOrderShippingInfo = { ...orderShipping, ...newShippingInfo };
      await db.collection('orders').updateOne({ _id: new ObjectId(app.orderId) }, { $set: { shippingInfo: mergedOrderShippingInfo } });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[PATCH /api/applications/stringing/[id]/shipping] error:', err);
    return new NextResponse('서버 오류 발생', { status: 500 });
  }
}

// ========== 신청서의 history 필드 조회 (날짜 내림차순 + 페이지네이션) =========
export async function handleGetApplicationHistory(req: NextRequest, context: { params: { id: string } }) {
  const { id } = await context.params;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = parseInt(url.searchParams.get('limit') || '5', 10);
  const skip = (page - 1) * limit;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });
  }

  const client = await clientPromise;
  const db = await getDb();
  const application = await db.collection('stringing_applications').findOne({ _id: new ObjectId(id) }, { projection: { history: 1 } });

  if (!application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  // 날짜 내림차순 정렬
  const allLogs = (application.history || []).sort((a: HistoryItem, b: HistoryItem) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // 페이징
  const paginated = allLogs.slice(skip, skip + limit);

  return NextResponse.json({
    history: paginated,
    total: allLogs.length,
  });
}

// ========== 로그인한 사용자의 스트링 신청서 전체 목록 조회 ==========
export async function handleGetApplicationList() {
  //  인증 처리
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return new NextResponse('Unauthorized', { status: 401 });

  const payload = verifyAccessToken(token);
  if (!payload) return new NextResponse('Unauthorized', { status: 401 });
  try {
    // MongoDB 연결
    const client = await clientPromise;
    const db = client.db();

    const userId = new ObjectId(payload.sub);

    // 'stringing_applications' 컬렉션에서 신청서 목록 전체 조회
    const applications = await db
      .collection('stringing_applications') // 정확한 컬렉션명 주의
      .find({ userId })
      .sort({ createdAt: -1 }) // 최신순 정렬
      .toArray();

    // 신청서 목록을 JSON 응답으로 반환
    return NextResponse.json(applications);
  } catch (err) {
    console.error('신청 목록 조회 오류:', err);
    //  에러 발생 시 500 상태와 메시지 반환
    return NextResponse.json({ message: '목록을 불러올 수 없습니다.' }, { status: 500 });
  }
}

// ==== 특정 날짜(preferredDate)에 예약된 시간대(preferredTime) 목록을 반환 ====

export async function handleGetReservedTimeSlots(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date'); // YYYY-MM-DD

    // 입력 검증
    const isValidDate = (s: string | null | undefined): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (!isValidDate(date)) {
      return NextResponse.json({ message: '유효하지 않은 날짜입니다.' }, { status: 400 });
    }

    // ===== 설정 로드(예약 가능 기간 포함) =====
    const db = (await clientPromise).db();

    type ExceptionItem = {
      date: string;
      closed?: boolean;
      start?: string;
      end?: string;
      interval?: number;
      capacity?: number;
    };
    type StringingSettings = {
      _id: 'stringingSlots';
      capacity?: number;
      businessDays?: number[];
      start?: string;
      end?: string;
      interval?: number;
      holidays?: string[];
      exceptions?: ExceptionItem[];
      bookingWindowDays?: number;
    };

    // 한 번에 필요한 필드들을 projection으로 가져옴
    const s = await db.collection<StringingSettings>('settings').findOne({ _id: 'stringingSlots' }, { projection: { capacity: 1, businessDays: 1, start: 1, end: 1, interval: 1, holidays: 1, exceptions: 1, bookingWindowDays: 1 } });

    // ===== 예약 가능 기간 제한(설정값 사용, 기본 30일) =====
    const WINDOW_DAYS = Number(s?.bookingWindowDays ?? 30);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${date}T00:00:00`);
    const max = new Date();
    max.setHours(0, 0, 0, 0);
    max.setDate(max.getDate() + WINDOW_DAYS);

    if (target < today || target > max) {
      return NextResponse.json({ message: `예약 가능 기간을 벗어났습니다. (오늘부터 ${WINDOW_DAYS}일 이내만 예약 가능)` }, { status: 400 });
    }

    // 기본값
    let capacity = Math.max(1, Math.min(10, Number(s?.capacity ?? 1)));
    let start = typeof s?.start === 'string' ? s!.start! : '10:00';
    let end = typeof s?.end === 'string' ? s!.end! : '19:00';
    let interval = Number.isFinite(s?.interval) ? Number(s!.interval) : 30;

    const bizDays = Array.isArray(s?.businessDays) ? s!.businessDays! : [1, 2, 3, 4, 5];
    const holidays = Array.isArray(s?.holidays) ? s!.holidays! : [];
    const exceptions = Array.isArray(s?.exceptions) ? s!.exceptions! : [];

    // 2) 예외일 우선 적용
    const ex = exceptions.find((e) => e.date === date);
    const jsDay = new Date(`${date}T00:00:00`).getDay();

    let isOpen: boolean;
    if (ex) {
      if (ex.closed) {
        // 예외일: 휴무
        isOpen = false;
      } else {
        // 예외일: 영업 + 값 오버라이드
        isOpen = true;
        if (ex.start) start = ex.start;
        if (ex.end) end = ex.end;
        if (typeof ex.interval === 'number') interval = Math.max(5, Math.min(240, Math.floor(ex.interval)));
        if (typeof ex.capacity === 'number') capacity = Math.max(1, Math.min(10, Math.floor(ex.capacity)));
      }
    } else {
      // 예외가 없으면: 요일/연휴 정책으로 영업 여부 결정
      const isHoliday = holidays.includes(date);
      isOpen = bizDays.includes(jsDay) && !isHoliday;
    }

    // 3) 슬롯 생성
    const toMin = (hhmm: string) => {
      const [h, m] = hhmm.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const toHHMM = (mins: number) => {
      const h = Math.floor(mins / 60),
        m = mins % 60;
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      return `${pad(h)}:${pad(m)}`;
    };

    let allTimes: string[] = [];
    if (isOpen) {
      const startMin = toMin(start);
      const endMin = toMin(end);
      const step = Math.max(5, Math.min(240, Math.floor(interval)));
      for (let t = startMin; t <= endMin; t += step) {
        allTimes.push(toHHMM(t));
      }
    } else {
      return NextResponse.json({ date, capacity, reservedTimes: [], allTimes: [], availableTimes: [], closed: true }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    // 4) 마감 시간 계산 (취소/초안 제외)
    const EXCLUDED = ['취소', 'draft'];
    const rows = await db
      .collection('stringing_applications')
      .aggregate([
        {
          $match: {
            'stringDetails.preferredDate': date,
            'stringDetails.preferredTime': { $type: 'string', $ne: '' },
            status: { $nin: EXCLUDED },
          },
        },
        { $group: { _id: '$stringDetails.preferredTime', count: { $sum: 1 } } },
        { $match: { count: { $gte: capacity } } },
        { $project: { _id: 0, time: '$_id' } },
        { $sort: { time: 1 } },
      ] as any[])
      .toArray();

    const reservedTimes = rows.map((r) => String(r.time).trim()).filter(Boolean);
    const availableTimes = allTimes.filter((t) => !reservedTimes.includes(t));

    return NextResponse.json({ date, capacity, reservedTimes, allTimes, availableTimes, closed: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[handleGetReservedTimeSlots] error', error);
    return NextResponse.json({ message: '예약 시간 조회 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// ========== 스트링 서비스 신청서 제출(POST) API ==========
export async function handleSubmitStringingApplication(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  const userId = payload?.sub ? new ObjectId(payload.sub) : null;

  try {
    // === 0) 요청 파싱 ===
    const {
      applicationId: bodyAppId, // 초안 id가 넘어올 수도 있음(없으면 undefined)
      name,
      phone,
      email,
      shippingInfo,
      racketType,
      stringTypes,
      customStringName,
      preferredDate,
      preferredTime,
      requirements,
      orderId, // 문자열 형태로 들어옴
      packageOptOut,
    } = await req.json();

    // === 1) 필수값 검증 ===
    if (!name || !phone || !racketType || !Array.isArray(stringTypes) || stringTypes.length === 0 || !preferredDate || !preferredTime) {
      return NextResponse.json({ message: '필수 항목 누락' }, { status: 400 });
    }

    const contactEmail = normalizeEmail(email);
    const contactPhone = (phone ?? '').replace(/\D/g, '') || null;

    // orderId 유효성 검증 + ObjectId 일원화
    if (!orderId || !ObjectId.isValid(orderId)) {
      return NextResponse.json({ message: '유효하지 않은 orderId' }, { status: 400 });
    }
    const orderObjectId = new ObjectId(orderId); // 이후 모든 쿼리는 이걸로만

    const db = await getDb();

    // === 2) 동일 시간대 수용 인원 체크 (draft/취소 제외) ===
    const EXCLUDED_STATUSES = ['취소', 'draft'] as const;
    type StringingSettings = { _id: 'stringingSlots'; capacity?: number };
    const sdoc = await db.collection<StringingSettings>('settings').findOne({ _id: 'stringingSlots' }, { projection: { capacity: 1 } });

    const capacity = Math.max(1, Math.min(10, Number(sdoc?.capacity ?? 1)));

    const concurrent = await db.collection('stringing_applications').countDocuments({
      'stringDetails.preferredDate': preferredDate,
      'stringDetails.preferredTime': preferredTime,
      status: { $nin: EXCLUDED_STATUSES },
    });
    if (concurrent >= capacity) {
      return NextResponse.json({ message: '선택하신 시간대는 방금 전 마감되었습니다. 다른 시간대를 선택해주세요.' }, { status: 409 });
    }

    // === 3) 같은 주문의 "진행중" 문서 탐지 ===
    // - 진행중 = 취소를 제외한 모든 상태 (draft 포함)
    const existingActive = await db.collection('stringing_applications').findOne({ orderId: orderObjectId, status: { $nin: ['취소'] } }, { projection: { _id: 1, status: 1, createdAt: 1 } });

    // 멱등성 정책:
    // - 이미 제출된 문서(= draft가 아닌 진행중: '검토 중' | '접수완료' | '작업 중')가 있으면 새 제출은 409로 차단
    //   단, 이어쓰기 안내(applicationId/location)를 함께 내려 UX 보완
    if (existingActive && existingActive.status !== 'draft') {
      return NextResponse.json(
        {
          code: 'APPLICATION_EXISTS',
          message: '이미 제출된 신청이 있습니다. 기존 신청서로 이동합니다.',
          applicationId: String(existingActive._id),
          status: existingActive.status,
          location: `/services/applications/${String(existingActive._id)}`,
        },
        {
          status: 409,
          headers: {
            Location: `/services/applications/${String(existingActive._id)}`,
          },
        }
      );
    }

    // === 4) 스트링 아이템 구성 ===
    const stringItems = await Promise.all(
      stringTypes.map(async (prodId: string) => {
        if (prodId === 'custom') {
          return { id: 'custom', name: customStringName?.trim() || '커스텀 스트링' };
        }
        const prod = await db.collection('products').findOne({ _id: new ObjectId(prodId) }, { projection: { name: 1 } });
        return { id: prodId, name: prod?.name ?? '알 수 없는 상품' };
      })
    );

    const stringDetails: any = {
      racketType,
      stringTypes,
      stringItems,
      ...(stringTypes.includes('custom') && customStringName ? { customStringName: customStringName.trim() } : {}),
      preferredDate,
      preferredTime,
      requirements,
    };

    // === 5) collectionMethod 정규화 & 일관 저장 ===
    const cm = norm(shippingInfo?.collectionMethod ?? 'self_ship'); // 'self_ship' | 'courier_pickup' | 'visit'
    if (shippingInfo && typeof shippingInfo === 'object') {
      shippingInfo.collectionMethod = cm; // 내부 필드도 표준화
    }

    // === 6) 금액 계산 / 패키지 처리 ===
    const totalBefore = await calcStringingTotal(db, stringTypes);
    let totalPrice = totalBefore;
    const serviceFeeBefore = totalBefore;

    // 최종 applicationId 결정 — bodyAppId 우선, 없으면 같은 주문의 draft 재사용, 없으면 신규
    const draftDoc = !bodyAppId
      ? await db.collection('stringing_applications').findOne({
          orderId: orderObjectId,
          status: 'draft',
        })
      : null;

    const applicationId = bodyAppId ? new ObjectId(bodyAppId) : draftDoc?._id ? draftDoc._id : new ObjectId();

    // 패키지 자동 차감 (멱등 로그 id = 최종 applicationId)
    let packageApplied = false;
    let packagePassId: ObjectId | null = null;
    let packageRedeemedAt: Date | null = null;

    if (userId && !packageOptOut) {
      const pass = await findOneActivePassForUser(db, userId);
      if (pass?._id) {
        try {
          await consumePass(db, pass._id, applicationId);
          packageApplied = true;
          packagePassId = pass._id;
          packageRedeemedAt = new Date();
        } catch {
          // PASS_CONSUME_FAILED 등은 무시하고 유료로 진행
        }
      }
    }
    if (packageApplied) totalPrice = 0;

    // === 7) 문서 저장: draft가 있거나 bodyAppId가 있으면 업데이트(승격), 아니면 신규 삽입 ===
    const baseDoc = {
      _id: applicationId, // 최종 _id 고정
      orderId: orderObjectId,
      name,
      phone,
      email,
      contactEmail,
      contactPhone,
      shippingInfo,
      collectionMethod: cm, // 최상위 필드도 표준화 값으로 저장
      stringDetails,
      totalPrice,
      serviceFeeBefore,
      packageApplied,
      packagePassId,
      packageRedeemedAt,
      status: '검토 중', // draft → 제출 상태로 승격
      submittedAt: new Date(),
      userId,
      guestName: userId ? null : name,
      guestEmail: userId ? null : email,
      guestPhone: userId ? null : phone,
      userSnapshot: userId ? { name, email } : null,
    };

    if (draftDoc || bodyAppId) {
      // 기존 draft 업데이트: createdAt 유지, _id는 $set 금지
      await db.collection('stringing_applications').updateOne(
        { _id: applicationId },
        {
          $set: {
            orderId: baseDoc.orderId,
            name: baseDoc.name,
            phone: baseDoc.phone,
            email: baseDoc.email,
            contactEmail: baseDoc.contactEmail,
            contactPhone: baseDoc.contactPhone,
            shippingInfo: baseDoc.shippingInfo,
            collectionMethod: baseDoc.collectionMethod,
            stringDetails: baseDoc.stringDetails,
            totalPrice: baseDoc.totalPrice,
            serviceFeeBefore: baseDoc.serviceFeeBefore,
            packageApplied: baseDoc.packageApplied,
            packagePassId: baseDoc.packagePassId,
            packageRedeemedAt: baseDoc.packageRedeemedAt,
            status: '검토 중',
            submittedAt: baseDoc.submittedAt,
            userId: baseDoc.userId,
            guestName: baseDoc.guestName,
            guestEmail: baseDoc.guestEmail,
            guestPhone: baseDoc.guestPhone,
            userSnapshot: baseDoc.userSnapshot,
          },
        }
      );
    } else {
      // 새 문서 삽입 (createdAt 추가)
      await db.collection('stringing_applications').insertOne({
        ...baseDoc,
        createdAt: new Date(),
      });
    }

    // === 8) 주문 플래그 업데이트 ===
    await db.collection('orders').updateOne({ _id: orderObjectId }, { $set: { isStringServiceApplied: true, stringingApplicationId: applicationId.toString() } });

    // === 9) 알림 ===
    const STATUS_VALUES = ['draft', '검토 중', '접수완료', '작업 중', '교체완료', '취소'] as const;
    type AppStatus = (typeof STATUS_VALUES)[number];

    const userCtx = { name, email: contactEmail || email };
    const appCtx = {
      applicationId: String(applicationId),
      orderId: orderId ? String(orderId) : null,
      status: '검토 중' as AppStatus,
      stringDetails: { preferredDate, preferredTime, racket: racketType, stringTypes },
      shippingInfo,
      phone,
      contactPhone,
    };
    const adminDetailUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/admin/applications/stringing/${String(applicationId)}`;

    await onApplicationSubmitted({ user: userCtx, application: appCtx, adminDetailUrl });

    return NextResponse.json({ message: 'success', applicationId }, { status: 201 });
  } catch (e) {
    console.error('[POST stringing_application]', e);
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 });
  }
}

// ================= DRAFT(초안) 생성/재사용 =================
// 목적: /services/apply?orderId=... 진입 시, 해당 주문에 진행 중 신청서가 "항상 1개" 존재하도록 보장
// 불변식: 같은 orderId에 status ∈ INPROGRESS_STATUSES 문서는 동시에 1개만
export async function handleCreateOrGetDraftApplication(req: Request) {
  try {
    const db = await getDb();
    const jar = await cookies();

    // 1) 로그인 사용자/관리자 페이로드
    const at = jar.get('accessToken')?.value ?? null;
    const payload = at ? verifyAccessToken(at) : null;
    const userId = payload?.sub ?? null;
    const isAdmin = payload?.role === 'admin';

    // 2) 요청 바디에서 orderId 먼저 파싱 (order를 조회하려면 orderId가 필요)
    const body = await req.json().catch(() => null);
    const orderId = body?.orderId as string | undefined;
    if (!orderId || !ObjectId.isValid(orderId)) {
      return new Response(JSON.stringify({ message: '유효하지 않은 orderId' }), { status: 400 });
    }

    // 3) 주문 조회 (이후 권한 판단에서 'order'를 사용하므로 반드시 먼저 조회)
    const ordersCol = db.collection('orders');
    const order = await ordersCol.findOne({ _id: new ObjectId(orderId) });
    if (!order) {
      return new Response(JSON.stringify({ message: '주문을 찾을 수 없습니다.' }), { status: 404 });
    }

    // 4) 게스트용 쿠키 토큰(있을 수도/없을 수도) → order 조회 후에 일치 여부 판단
    const oax = jar.get('orderAccessToken')?.value ?? null;
    const guestClaims = oax ? verifyOrderAccessToken(oax) : null;

    // 5) 권한: (주문 소유자) or (관리자) or (게스트 토큰의 orderId 일치)
    const isOwner = !!(order?.userId && String(order.userId) === String(userId));
    const guestOwnsOrder = !!(guestClaims && guestClaims.orderId === String(order._id));

    if (!isOwner && !isAdmin && !guestOwnsOrder) {
      return new Response(JSON.stringify({ message: 'forbidden' }), { status: 403 });
    }

    // 6) 서비스 대상 확인: withStringService / isStringServiceApplied 둘 다 허용
    const withString = Boolean(order?.shippingInfo?.withStringService) || Boolean(order?.isStringServiceApplied);
    if (!withString) {
      return new Response(JSON.stringify({ message: '스트링 서비스 대상 주문이 아닙니다.' }), { status: 400 });
    }

    const appsCol = db.collection('stringing_applications');

    // 7) 이미 진행중(draft/received) 있으면 재사용
    const existing = await appsCol.findOne({
      orderId: { $in: [order._id, String(order._id)] }, // ✅ ObjectId와 string 모두 매칭
      status: { $in: INPROGRESS_STATUSES },
    });

    const link = `/services/apply?orderId=${orderId}`;
    if (existing) {
      // 초안이면 expireAt 24h 연장 (사용자가 계속 작업 중인 경우 자동 연장)
      if (existing.status === 'draft') {
        await appsCol.updateOne({ _id: existing._id }, { $set: { expireAt: new Date(Date.now() + 24 * 60 * 60 * 1000), updatedAt: new Date().toISOString() } });
      }
      return new Response(JSON.stringify({ applicationId: String(existing._id), orderId, link, reused: true }), { status: 200 });
    }

    // 주문의 선택에 따라 기본 수거방식 결정
    const initialCollectionMethod: 'self_ship' | 'courier_pickup' | 'visit' =
      (order as any)?.servicePickupMethod === 'COURIER_PICKUP' ? 'courier_pickup' : (order as any)?.servicePickupMethod === 'VISIT' || (order as any)?.shippingInfo?.deliveryMethod === '방문수령' ? 'visit' : 'self_ship';

    // 8) 없으면 초안 생성
    const now = new Date();
    const doc = {
      userId: userId ? new ObjectId(userId) : null,
      orderId: order._id,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),

      // 최소 스키마 기본값(고아 draft 방지)
      customer: {
        name: (order as any)?.customer?.name ?? (order as any)?.userSnapshot?.name ?? (order as any)?.guestInfo?.name ?? '',
        email: (order as any)?.customer?.email ?? (order as any)?.userSnapshot?.email ?? (order as any)?.guestInfo?.email ?? '',
        phone: (order as any)?.customer?.phone ?? (order as any)?.shippingInfo?.phone ?? (order as any)?.guestInfo?.phone ?? '',
      },

      stringDetails: { stringTypes: [], customStringName: '' },

      shippingInfo: {
        name: (order as any)?.shippingInfo?.name ?? (order as any)?.customer?.name ?? '',
        phone: (order as any)?.shippingInfo?.phone ?? (order as any)?.customer?.phone ?? '',
        email: (order as any)?.customer?.email ?? undefined,
        address: (order as any)?.shippingInfo?.address ?? '',
        addressDetail: (order as any)?.shippingInfo?.addressDetail ?? '',
        postalCode: (order as any)?.shippingInfo?.postalCode ?? '',
        depositor: (order as any)?.shippingInfo?.depositor ?? null,
        bank: (order as any)?.paymentInfo?.bank ?? null,
        deliveryRequest: (order as any)?.shippingInfo?.deliveryRequest ?? '',
        collectionMethod: initialCollectionMethod,
      },

      collectionMethod: initialCollectionMethod,
      pickup: null,

      stringItems: [],
      totalPrice: 0,

      usedPackage: { passId: undefined, consumed: false },

      status: 'draft',
      expireAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // TTL
      history: [{ status: 'draft', date: now.toISOString(), description: '주문 기반 자동 초안 생성' }],
    };

    let result;
    try {
      result = await appsCol.insertOne(doc);
    } catch (err: any) {
      if (err?.code === 11000) {
        // 레이스 시 재조회해서 재사용으로 응답
        const reused = await appsCol.findOne({ orderId: String(order._id), status: { $in: INPROGRESS_STATUSES } }, { projection: { _id: 1 } });
        if (reused) {
          return new Response(
            JSON.stringify({
              applicationId: String(reused._id),
              orderId,
              link,
              reused: true,
            }),
            { status: 200 }
          );
        }
      }
      throw err;
    }

    return new Response(JSON.stringify({ applicationId: String(result.insertedId), orderId, link, reused: false }), { status: 201 });
  } catch (e) {
    console.error('[stringing drafts] error:', e);
    return new Response(JSON.stringify({ message: '서버 오류' }), { status: 500 });
  }
}
