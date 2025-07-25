import { NextRequest, NextResponse } from 'next/server';
import clientPromise, { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { HistoryItem, HistoryRecord } from '@/lib/types/stringing-application-db';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import { getStringingServicePrice } from '@/lib/stringing-prices';

// ================= GET (단일 신청서 조회) =================
export async function handleGetStringingApplication(req: Request, id: string) {
  const client = await clientPromise;
  const db = await getDb();

  try {
    const app = await db.collection('stringing_applications').findOne({ _id: new ObjectId(id) });
    if (!app) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // 상품 ID 배열을 실제 상품명과 매핑
    const stringItems = await Promise.all(
      (app.stringDetails.stringTypes || []).map(async (prodId: string) => {
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
          price:
            // DB에 mountingFee가 있으면 사용
            prod?.mountingFee ??
            // 아니면 getStringingServicePrice에 isCustom=false로 호출
            getStringingServicePrice(item.id, false),
          quantity: 1,
        };
      })
    );

    // total 계산
    const total = items.reduce((sum, x) => sum + x.price * x.quantity, 0);

    const customer = {
      name: app.customer?.name ?? app.userSnapshot?.name ?? app.guestName ?? '-',
      email: app.customer?.email ?? app.userSnapshot?.email ?? app.guestEmail ?? '-',
      phone: app.customer?.phone ?? app.shippingInfo?.phone ?? app.guestPhone ?? '',
      address: app.customer?.address ?? app.shippingInfo?.address ?? '',
      addressDetail: app.customer?.addressDetail ?? app.shippingInfo?.addressDetail ?? '',
      postalCode: app.customer?.postalCode ?? app.shippingInfo?.postalCode ?? '',
    };
    return NextResponse.json({
      id: app._id.toString(),
      orderId: app.orderId?.toString() || null,
      customer,
      requestedAt: app.createdAt,
      desiredDateTime: app.desiredDateTime,
      status: app.status,
      paymentStatus: app.paymentStatus,
      shippingInfo: app.shippingInfo || null,
      memo: app.memo || '',
      photos: app.photos || [],
      stringDetails: {
        racketType: app.stringDetails.racketType,
        preferredDate: app.stringDetails.preferredDate,
        preferredTime: app.stringDetails.preferredTime,
        requirements: app.stringDetails.requirements,
        stringItems,

        ...(app.stringDetails.customStringName && {
          customStringName: app.stringDetails.customStringName,
        }),
      },
      items,
      total,
      totalPrice: app.totalPrice ?? 0,
      history: (app.history ?? []).map((record: HistoryRecord) => ({
        status: record.status,
        date: record.date,
        description: record.description,
      })),
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
  const { name, email, phone, address, addressDetail, postalCode, depositor, totalPrice, stringDetails } = await req.json();

  const app = await db.collection('stringing_applications').findOne({ _id: new ObjectId(id) });
  if (!app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  const setFields: any = {};
  const pushHistory: any[] = [];

  // 고객정보 변경
  if (name || email || phone || address || addressDetail || postalCode) {
    // 기존 customer 병합
    const baseCustomer = app.customer ?? {
      name: app.userSnapshot?.name ?? app.guestName ?? '',
      email: app.userSnapshot?.email ?? app.guestEmail ?? '',
      phone: app.guestPhone ?? app.shippingInfo?.phone ?? '',
      address: app.shippingInfo?.address ?? '',
      addressDetail: app.shippingInfo?.addressDetail ?? '',
      postalCode: app.shippingInfo?.postalCode ?? '',
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
  if (totalPrice !== undefined) {
    setFields.totalPrice = totalPrice;
    pushHistory.push({
      status: '결제 금액 수정',
      date: new Date(),
      description: `결제 금액을 ${totalPrice.toLocaleString()}원으로 수정했습니다.`,
    });
  }

  // 스트링 세부정보 변경
  if (stringDetails) {
    setFields.stringDetails = stringDetails;
    pushHistory.push({
      status: '스트링 정보 수정',
      date: new Date(),
      description: '스트링 세부 정보를 수정했습니다.',
    });
  }

  // 실제 업데이트
  const result = await db.collection('stringing_applications').updateOne({ _id: new ObjectId(id) }, {
    $set: setFields,
    $push: { history: { $each: pushHistory } },
  } as any);

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
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
  const { status } = await req.json();
  if (!status || typeof status !== 'string') {
    return NextResponse.json({ error: '상태값 누락 또는 형식 오류' }, { status: 400 });
  }

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
  const result = await db.collection('stringing_applications').updateOne({ _id: new ObjectId(id) }, {
    $set: { status }, // 상태 변경
    $push: {
      history: {
        $each: [historyEntry], // 이력 추가
      },
    },
  } as any);

  // 신청서를 찾지 못했을 경우
  if (result.matchedCount === 0) {
    return NextResponse.json({ error: '신청서를 찾을 수 없습니다.' }, { status: 404 });
  }

  //  정상 처리 시 성공 응답 반환
  return NextResponse.json({ success: true });
}

// ========== 배송 정보 수정 (스트링 신청서 + 연결된 주문서) ==========
export async function handleUpdateShippingInfo(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const client = await clientPromise;
    const db = await getDb();

    const app = await db.collection('stringing_applications').findOne({ _id: new ObjectId(id) });
    if (!app) {
      return new NextResponse('신청서를 찾을 수 없습니다.', { status: 404 });
    }

    const newShippingInfo = body.shippingInfo;
    if (!newShippingInfo) {
      return new NextResponse('배송 정보가 필요합니다.', { status: 400 });
    }

    // 기존 배송 정보와 병합
    const mergedShippingInfo = {
      ...app.shippingInfo, // 기존 값
      ...newShippingInfo, // 새 값으로 덮어쓰기
    };

    // 스트링 신청서 업데이트
    await db.collection('stringing_applications').updateOne({ _id: new ObjectId(id) }, { $set: { shippingInfo: mergedShippingInfo } });

    // 연결된 주문도 업데이트
    if (app.orderId) {
      const order = await db.collection('orders').findOne({ _id: new ObjectId(app.orderId) });
      const orderShipping = order?.shippingInfo || {};

      const mergedOrderShippingInfo = {
        ...orderShipping,
        ...newShippingInfo,
      };

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
  // 요청 URL에서 쿼리 파라미터(searchParams)를 추출함
  const { searchParams } = new URL(req.url);

  // 사용자가 요청한 날짜를 가져옴 (예: 2024-06-20)
  const date = searchParams.get('date');

  // 날짜가 없을 경우 400 Bad Request 에러 응답
  if (!date) {
    return NextResponse.json({ error: '날짜가 누락되었습니다.' }, { status: 400 });
  }

  try {
    // MongoDB 클라이언트 연결
    const client = await clientPromise;
    const db = client.db();

    // 'applications' 컬렉션 접근 (스트링 장착 신청서가 저장된 곳)
    const stringing_applications = db.collection('stringing_applications');

    // 해당 날짜(date)에 접수된 신청서 중 preferredTime(희망 시간대) 필드만 조회
    const results = await stringing_applications
      .find({ 'stringDetails.preferredDate': date }) // preferredDate가 같은 문서 필터
      .project({ 'stringDetails.preferredTime': 1, _id: 0 }) // preferredTime만 가져오고 _id는 제외
      .toArray(); // 커서를 배열로 변환

    // preferredTime 필드만 뽑아서 배열로 정리 (null 등 falsy 값은 필터링)
    // const reservedSlots = results.map((doc) => doc.preferredTime).filter(Boolean);
    const reservedSlots = results.map((doc) => doc.stringDetails?.preferredTime).filter(Boolean);

    // 예약된 시간대 목록을 JSON으로 응답
    return NextResponse.json({ reservedTimes: reservedSlots });
  } catch (err) {
    // 서버 오류가 발생하면 로그를 출력하고 500 Internal Server Error 응답
    console.error('[GET /reserved-slots] Error:', err);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// ========== 스트링 서비스 신청서 제출(POST) API ==========
export async function handleSubmitStringingApplication(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  const payload = token ? verifyAccessToken(token) : null;
  const userId = payload?.sub ? new ObjectId(payload.sub) : null;

  try {
    // body에서 필요한 값들 추출
    const { name, phone, email, shippingInfo, racketType, stringTypes, customStringName, preferredDate, preferredTime, requirements, orderId } = await req.json();

    // 필수 필드 검증
    if (!name || !phone || !racketType || !Array.isArray(stringTypes) || stringTypes.length === 0 || !preferredDate) {
      return NextResponse.json({ message: '필수 항목 누락' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = await getDb();

    // 중복 예약 방지 로직
    const existing = await db.collection('stringing_applications').findOne({
      'stringDetails.preferredDate': preferredDate,
      'stringDetails.preferredTime': preferredTime,
    });
    if (existing) {
      return NextResponse.json({ error: '이미 해당 시간대에 신청이 존재합니다.' }, { status: 409 });
    }

    // 상품 ID 배열을 실제 상품명과 매핑 (custom 스킵)
    const stringItems = await Promise.all(
      stringTypes.map(async (prodId: string) => {
        if (prodId === 'custom') {
          // 직접 입력인 경우 DB 조회 없이 커스텀 이름 사용
          return {
            id: 'custom',
            name: customStringName?.trim() || '커스텀 스트링',
          };
        }
        // 그 외엔 정상 조회
        const prod = await db.collection('products').findOne({ _id: new ObjectId(prodId) }, { projection: { name: 1 } });
        return {
          id: prodId,
          name: prod?.name ?? '알 수 없는 상품',
        };
      })
    );
    const stringDetails: any = {
      racketType,
      stringTypes,
      stringItems,
      ...(stringTypes.includes('custom') && customStringName ? { customStringName: customStringName.trim() } : {}), // custom 입력이 있으면 customStringName 필드 추가
      preferredDate,
      preferredTime,
      requirements,
    };

    // 금액 계산
    let totalPrice = 0;
    for (const id of stringTypes) {
      if (id === 'custom') {
        totalPrice += 15000; // 직접입력 기본요금
      } else {
        // products 컬렉션에서 mountingFee 조회
        const prod = await db.collection('products').findOne({ _id: new ObjectId(id) });
        totalPrice += prod?.mountingFee ?? 0;
      }
    }

    // 신청서 저장
    const result = await db.collection('stringing_applications').insertOne({
      orderId: new ObjectId(orderId),
      name,
      phone,
      email,
      shippingInfo,
      stringDetails,
      totalPrice,
      status: '검토 중',
      createdAt: new Date(),
      userId,
      guestName: userId ? null : name,
      guestEmail: userId ? null : email,
      guestPhone: userId ? null : phone,
      userSnapshot: userId ? { name, email } : null,
    });

    // 주문에도 플래그 추가
    await db.collection('orders').updateOne(
      { _id: new ObjectId(orderId) },
      {
        $set: {
          isStringServiceApplied: true,
          stringingApplicationId: result.insertedId.toString(),
        },
      }
    );

    return NextResponse.json({ message: 'success', applicationId: result.insertedId }, { status: 201 });
  } catch (e) {
    console.error('[POST stringing_application]', e);
    return NextResponse.json({ message: '서버 오류 발생' }, { status: 500 });
  }
}
