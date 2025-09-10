import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { issuePassesForPaidPackageOrder } from '@/lib/passes.service';
import type { PackageOrder } from '@/lib/types/package-order';
import jwt from 'jsonwebtoken';

//* 테스트 데이터 */
// 원하는 만료일로 직접 설정
// db.service_passes.updateOne(
//   { _id: ObjectId("68b97c5cc5ca4f768bd976b9") },
//   { $set: { expiresAt: ISODate("2024-09-04T11:47:40.819Z") } } // 예: 바로 만료 직전
// );

// // 또는 만료일 제거 -> 서버가 다시 계산
// db.service_passes.updateOne(
//   { _id: ObjectId("68b97c5cc5ca4f768bd976b9") },
//   { $unset: { expiresAt: "" } }
// );

// PATCH: 상태 변경 (결제완료 -> 패스 멱등 발급 포함)
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // 토큰 읽기 (access 우선, refresh 보조)
    const jar = await cookies();
    const at = jar.get('accessToken')?.value;
    const rt = jar.get('refreshToken')?.value;

    let user: any = at ? verifyAccessToken(at) : null;
    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {}
    }
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 관리자 체크 (+ 이메일 화이트리스트)
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = user?.role === 'admin' || user?.roles?.includes?.('admin') || user?.isAdmin === true || ADMIN_EMAILS.includes((user?.email ?? '').toLowerCase());

    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const db = (await clientPromise).db();
    const packageOrders = db.collection<PackageOrder>('packageOrders');

    const body = await request.json();
    const statusStr = String(body?.status ?? '').trim();
    const reason = String(body?.reason ?? '').trim();

    // 결제 계열 상태 집합과 paymentStatus 매핑(취소 -> 결제취소)
    const paymentSet = new Set(['결제대기', '결제완료', '결제취소', '취소']);
    const willSetPayment = paymentSet.has(statusStr);
    const paymentToSet = statusStr === '취소' ? '결제취소' : statusStr; // 서버 저장은 결제취소로 통일

    const now = new Date();
    const _id = new ObjectId(id);

    const pkgOrder = await packageOrders.findOne({ _id });
    if (!pkgOrder) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    const prevPayment = pkgOrder.paymentStatus ?? '결제대기';
    const adminLabel = String(user?.name ?? user?.email ?? user?.sub ?? '');
    const historyDesc = willSetPayment
      ? `결제 상태 ${prevPayment} → ${paymentToSet}` + (reason ? ` / 사유: ${reason}` : '') + (adminLabel ? ` / 관리자: ${adminLabel}` : '')
      : `상태 변경: ${statusStr}` + (reason ? ` / 사유: ${reason}` : '') + (adminLabel ? ` / 관리자: ${adminLabel}` : '');

    await packageOrders.updateOne(
      { _id },
      {
        $set: {
          status: statusStr,
          updatedAt: now,
          ...(willSetPayment ? { paymentStatus: paymentToSet as any } : {}),
        },
        $push: {
          history: {
            $each: [
              {
                status: statusStr,
                date: now,
                description: historyDesc,
              } satisfies PackageOrder['history'][number],
            ],
          },
        },
      }
    );

    if (statusStr === '결제완료') {
      // 결제완료 시 패스 발급(멱등)
      await issuePassesForPaidPackageOrder(db, { ...pkgOrder, _id });
    }

    /**
     * 주문/결제 상태에 따라 연결된 패스 상태 동기화
     * - 결제완료가 아니면: suspended
     * - 결제완료이면: active (단, 잔여/만료 체크)
     */
    try {
      const passCol = db.collection('service_passes');
      const now = new Date();

      // 이 주문과 연결된 패스(보통 1개)
      const passDoc = await passCol.findOne({ orderId: _id });

      if (passDoc) {
        // '결제완료' 이외(결제대기/결제취소/주문 취소 등)는 모두 suspended로 본다
        const shouldSuspend = statusStr !== '결제완료';

        if (shouldSuspend) {
          if (passDoc.status !== 'suspended') {
            await passCol.updateOne({ _id: passDoc._id }, { $set: { status: 'suspended', updatedAt: now } });
          }
        } else {
          // 결제완료인 경우에만 active로 복구 (잔여 & 미만료일 때)
          const stillValid = (passDoc.remainingCount ?? 0) > 0 && (!passDoc.expiresAt || passDoc.expiresAt > now);

          if (stillValid && passDoc.status !== 'active') {
            await passCol.updateOne({ _id: passDoc._id }, { $set: { status: 'active', updatedAt: now } });
          }
        }
      }
    } catch (e) {
      console.error('[package-orders] pass status sync error', e);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[PATCH /api/package-orders/[id]] error', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}

// GET: 관리자 상세 조회 (고객정보 + 사용 이력 포함)
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    // 토큰 읽기 (access 우선, refresh 보조)
    const jar = await cookies();
    const at = jar.get('accessToken')?.value || null;
    const rt = jar.get('refreshToken')?.value || null;

    let user: any = at ? verifyAccessToken(at) : null;
    if (!user && rt) {
      try {
        user = jwt.verify(rt, process.env.REFRESH_TOKEN_SECRET!);
      } catch {}
    }
    if (!user?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 관리자 체크 (+ 이메일 화이트리스트)
    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = user?.role === 'admin' || user?.roles?.includes?.('admin') || user?.isAdmin === true || ADMIN_EMAILS.includes((user?.email ?? '').toLowerCase());

    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const _id = new ObjectId(id);
    const db = (await clientPromise).db();
    const col = db.collection('packageOrders');

    const rows = await col
      .aggregate([
        { $match: { _id } },

        // 사용자 프로필 조인 (전화/이름/이메일 보강)
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userDocs' } },
        { $addFields: { userDoc: { $first: '$userDocs' } } },

        // 패스 조인
        { $lookup: { from: 'service_passes', localField: '_id', foreignField: 'orderId', as: 'passDocs' } },
        { $addFields: { passDoc: { $first: '$passDocs' } } },

        // 패스/표시용 계산 + 사용 이력 변환
        {
          $addFields: {
            passUsed: { $ifNull: ['$passDoc.usedCount', 0] },
            passRemaining: { $ifNull: ['$passDoc.remainingCount', '$packageInfo.sessions'] },
            packageType: { $concat: [{ $toString: '$packageInfo.sessions' }, '회권'] },

            // 구매일/만료일 계산: 패스 값 우선
            _calcExpiry: {
              $ifNull: [
                '$passDoc.expiresAt',
                {
                  $dateAdd: {
                    startDate: { $ifNull: ['$passDoc.purchasedAt', '$createdAt'] },
                    unit: 'day',
                    amount: '$packageInfo.validityPeriod',
                  },
                },
              ],
            },
            expiryDate: '$_calcExpiry',

            serviceType: {
              $cond: [{ $regexMatch: { input: { $ifNull: ['$serviceInfo.serviceMethod', '방문'] }, regex: '출장', options: 'i' } }, '출장', '방문'],
            },

            usageHistory: {
              $map: {
                input: { $ifNull: ['$passDoc.redemptions', []] },
                as: 'r',
                in: {
                  id: { $concat: [{ $toString: '$passDoc._id' }, '-', { $toString: { $indexOfArray: ['$passDoc.redemptions', '$$r'] } }] },
                  applicationId: { $toString: '$$r.applicationId' },
                  date: '$$r.usedAt',
                  sessionsUsed: { $ifNull: ['$$r.count', 1] },
                  description: '스트링 교체 차감',
                  adminNote: { $cond: ['$$r.reverted', '취소/복원됨', ''] },
                },
              },
            },

            // 패스 운영 이력(연장+횟수조절) 변환 + 결제상태 변경 합치기
            passOps: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ['$passDoc.history', []] },
                    as: 'h',
                    cond: { $in: ['$$h.type', ['extend_expiry', 'adjust_sessions']] },
                  },
                },
                as: 'h',
                in: {
                  id: { $toString: '$$h._id' },
                  date: '$$h.at',
                  // +N일 / +N회 뱃지 값
                  extendedDays: {
                    $cond: [
                      { $eq: ['$$h.type', 'extend_expiry'] },
                      {
                        $cond: [{ $and: ['$$h.from', '$$h.to'] }, { $toInt: { $divide: [{ $subtract: ['$$h.to', '$$h.from'] }, 86400000] } }, { $ifNull: ['$$h.daysAdded', 0] }],
                      },
                      0,
                    ],
                  },
                  extendedSessions: {
                    $cond: [{ $eq: ['$$h.type', 'adjust_sessions'] }, { $ifNull: ['$$h.delta', 0] }, 0],
                  },
                  reason: { $ifNull: ['$$h.reason', ''] },
                  adminName: { $ifNull: ['$$h.adminName', ''] },
                  adminEmail: { $ifNull: ['$$h.adminEmail', ''] },
                  from: { $ifNull: ['$$h.from', null] },
                  to: { $ifNull: ['$$h.to', null] },
                  eventType: '$$h.type', // 'extend_expiry' | 'adjust_sessions'
                },
              },
            },

            // 주문 히스토리 중 "결제상태" 변경만 따로 변환
            paymentOps: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ['$history', []] },
                    as: 'h',
                    cond: { $in: ['$$h.status', ['결제대기', '결제완료', '결제취소', '취소']] },
                  },
                },
                as: 'h',
                in: {
                  id: { $concat: ['pay-', { $toString: '$$h.date' }] },
                  date: '$$h.date',
                  extendedDays: 0,
                  extendedSessions: 0,
                  reason: { $ifNull: ['$$h.description', ''] },
                  adminName: '',
                  adminEmail: '',
                  from: null,
                  to: null,
                  eventType: 'payment_status_change',
                  paymentStatus: '$$h.status',
                },
              },
            },

            // 패스 운영 이력(연장+횟수조절) + 결제상태 변경 합치기
            operationsHistory: {
              $concatArrays: [
                // 1) 결제 상태 변경 이벤트
                {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ['$history', []] },
                        as: 'h',
                        cond: { $in: ['$$h.status', ['결제대기', '결제완료', '결제취소', '취소']] },
                      },
                    },
                    as: 'h',
                    in: {
                      id: { $concat: ['pay-', { $toString: '$$h.date' }] },
                      date: '$$h.date',
                      extendedDays: 0,
                      extendedSessions: 0,
                      reason: { $ifNull: ['$$h.description', ''] },
                      adminName: '',
                      adminEmail: '',
                      from: null,
                      to: null,
                      eventType: 'payment_status_change',
                      paymentStatus: '$$h.status',
                    },
                  },
                },

                // 2) 패스 이력(연장/횟수조절)
                {
                  $map: {
                    input: {
                      $filter: {
                        input: { $ifNull: ['$passDoc.history', []] },
                        as: 'h',
                        cond: { $in: ['$$h.type', ['extend_expiry', 'adjust_sessions']] },
                      },
                    },
                    as: 'h',
                    in: {
                      id: { $toString: '$$h._id' },
                      date: '$$h.at',
                      extendedDays: {
                        $cond: [
                          { $eq: ['$$h.type', 'extend_expiry'] },
                          {
                            $cond: [{ $and: ['$$h.from', '$$h.to'] }, { $toInt: { $divide: [{ $subtract: ['$$h.to', '$$h.from'] }, 86400000] } }, { $ifNull: ['$$h.daysAdded', 0] }],
                          },
                          0,
                        ],
                      },
                      extendedSessions: {
                        $cond: [{ $eq: ['$$h.type', 'adjust_sessions'] }, { $ifNull: ['$$h.delta', 0] }, 0],
                      },
                      reason: { $ifNull: ['$$h.reason', ''] },
                      adminName: { $ifNull: ['$$h.adminName', ''] },
                      adminEmail: { $ifNull: ['$$h.adminEmail', ''] },
                      from: { $ifNull: ['$$h.from', null] },
                      to: { $ifNull: ['$$h.to', null] },
                      eventType: '$$h.type', // 'extend_expiry' | 'adjust_sessions'
                    },
                  },
                },
              ],
            },
          },
        },

        // 패스 상태(만료일 우선 적용)
        {
          $addFields: {
            passStatusKo: {
              $let: {
                vars: { exp: '$_calcExpiry' },
                in: {
                  $switch: {
                    branches: [
                      // 결제 취소면 무조건 '취소'
                      { case: { $eq: ['$paymentStatus', '결제취소'] }, then: '취소' },
                      // 만료일이 지났으면 '만료' (표시용 우선)
                      { case: { $lte: ['$$exp', '$$NOW'] }, then: '만료' },
                      // 결제 완료면 '활성'
                      { case: { $eq: ['$paymentStatus', '결제완료'] }, then: '활성' },
                    ],
                    // 그 외는 '대기'(= 비활성)
                    default: '대기',
                  },
                },
              },
            },
          },
        },

        // 고객 표시용: 후보 배열에서 "공백 아닌 첫 값" 선택
        {
          $addFields: {
            customerName: {
              $let: {
                vars: {
                  cands: [{ $ifNull: ['$serviceInfo.name', ''] }, { $ifNull: ['$shippingInfo.name', ''] }, { $ifNull: ['$userSnapshot.name', ''] }, { $ifNull: ['$userDoc.name', ''] }, { $ifNull: ['$userDoc.profile.name', ''] }],
                },
                in: {
                  $first: {
                    $filter: {
                      input: '$$cands',
                      as: 'v',
                      cond: { $gt: [{ $strLenCP: { $trim: { input: '$$v' } } }, 0] },
                    },
                  },
                },
              },
            },
            customerEmail: {
              $let: {
                vars: {
                  cands: [{ $ifNull: ['$serviceInfo.email', ''] }, { $ifNull: ['$userSnapshot.email', ''] }, { $ifNull: ['$userDoc.email', ''] }],
                },
                in: {
                  $first: {
                    $filter: {
                      input: '$$cands',
                      as: 'v',
                      cond: { $gt: [{ $strLenCP: { $trim: { input: '$$v' } } }, 0] },
                    },
                  },
                },
              },
            },
            customerPhone: {
              $let: {
                vars: {
                  cands: [{ $ifNull: ['$serviceInfo.phone', ''] }, { $ifNull: ['$shippingInfo.phone', ''] }, { $ifNull: ['$userDoc.phone', ''] }, { $ifNull: ['$userDoc.profile.phone', ''] }, { $ifNull: ['$userDoc.phoneNumber', ''] }],
                },
                in: {
                  $first: {
                    $filter: {
                      input: '$$cands',
                      as: 'v',
                      cond: { $gt: [{ $strLenCP: { $trim: { input: '$$v' } } }, 0] },
                    },
                  },
                },
              },
            },
          },
        },

        // 최종 Shape
        {
          $project: {
            _id: 0,
            id: { $toString: '$_id' },
            userId: { $toString: '$userId' },
            customer: { name: '$customerName', email: '$customerEmail', phone: '$customerPhone' },
            packageType: '$packageType',
            totalSessions: '$packageInfo.sessions',
            remainingSessions: '$passRemaining',
            usedSessions: '$passUsed',
            price: '$totalPrice',
            purchaseDate: { $ifNull: ['$passDoc.purchasedAt', '$createdAt'] },
            expiryDate: { $ifNull: ['$expiryDate', '$_calcExpiry'] },
            status: '$status',
            paymentStatus: '$paymentStatus',
            serviceType: '$serviceType',
            usageHistory: '$usageHistory',
            history: '$history',
            passStatus: '$passStatusKo',
            operationsHistory: '$operationsHistory',
            extensionHistory: '$operationsHistory',
          },
        },
      ])
      .toArray();

    const item = rows[0] || null;
    if (!item) return NextResponse.json({ error: 'Not Found' }, { status: 404 });

    return NextResponse.json({ item });
  } catch (e) {
    console.error('[GET /api/package-orders/[id]] error', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
