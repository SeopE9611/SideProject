import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAccessToken } from '@/lib/auth.utils';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

type SortKey = 'customer' | 'purchaseDate' | 'remainingSessions' | 'price';

export async function GET(req: Request) {
  try {
    // 인증/권한
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

    const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const isAdmin = user?.role === 'admin' || user?.roles?.includes?.('admin') || user?.isAdmin === true || ADMIN_EMAILS.includes((user?.email ?? '').toLowerCase());

    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // 쿼리 파싱
    const url = new URL(req.url);
    const sp = url.searchParams;

    const page = Math.max(1, parseInt(sp.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(sp.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const q = (sp.get('q') || '').trim();
    const status = sp.get('status');
    const payment = sp.get('payment');
    const pkg = sp.get('package');
    const service = sp.get('service');
    const sortParam = sp.get('sort');

    const match: any = {};
    // if (status && status !== 'all') match.status = status;
    if (payment && payment !== 'all') match.paymentStatus = payment;
    if (pkg && pkg !== 'all') match['packageInfo.sessions'] = Number(pkg);
    if (service && service !== 'all') {
      match['serviceInfo.serviceMethod'] = { $regex: service === '출장' ? '출장' : '방문', $options: 'i' };
    }
    if (q) {
      const or: any[] = [
        { 'userSnapshot.name': { $regex: q, $options: 'i' } },
        { 'userSnapshot.email': { $regex: q, $options: 'i' } },
        { 'serviceInfo.name': { $regex: q, $options: 'i' } },
        { 'serviceInfo.email': { $regex: q, $options: 'i' } },
        { 'shippingInfo.name': { $regex: q, $options: 'i' } },
      ];
      if (/^[0-9a-fA-F]{24}$/.test(q)) or.push({ _id: new ObjectId(q) });
      match.$or = or;
    }

    // 정렬 문서
    let sortDoc: Record<string, 1 | -1> = { createdAt: -1, _id: -1 };
    if (sortParam) {
      const [rawKey, rawDir] = String(sortParam).split(':');
      const dir: 1 | -1 = rawDir === 'asc' ? 1 : -1;
      const map: Record<SortKey, string> = {
        customer: 'customerName',
        purchaseDate: 'purchaseDate',
        remainingSessions: 'passRemaining',
        price: 'totalPrice',
      };
      const key = map[rawKey as SortKey] ?? 'createdAt';
      sortDoc = { [key]: dir, createdAt: -1, _id: -1 };
    }

    const db = (await clientPromise).db();
    const col = db.collection('packageOrders');

    const pipeline: any[] = [
      { $match: match },

      // 사용자 조인
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userDocs' } },
      { $addFields: { userDoc: { $first: '$userDocs' } } },

      // service_passes 조인 (orderId ←→ _id)
      { $lookup: { from: 'service_passes', localField: '_id', foreignField: 'orderId', as: 'passDocs' } },
      { $addFields: { passDoc: { $first: '$passDocs' } } },

      // 만료일 계산
      {
        $addFields: {
          passUsed: { $ifNull: ['$passDoc.usedCount', 0] },
          passRemaining: { $ifNull: ['$passDoc.remainingCount', '$packageInfo.sessions'] },
          packageType: { $concat: [{ $toString: '$packageInfo.sessions' }, '회권'] },

          purchaseDate: { $ifNull: ['$passDoc.purchasedAt', '$createdAt'] },
          _calcExpiry: {
            $ifNull: ['$passDoc.expiresAt', { $dateAdd: { startDate: '$createdAt', unit: 'day', amount: { $ifNull: ['$packageInfo.validityPeriod', 0] } } }],
          },

          serviceType: {
            $cond: [{ $regexMatch: { input: { $ifNull: ['$serviceInfo.serviceMethod', '방문'] }, regex: '출장', options: 'i' } }, '출장', '방문'],
          },
        },
      },

      // 패스 상태(만료 우선)
      {
        $addFields: {
          passStatusKo: {
            $let: {
              vars: { exp: '$_calcExpiry' },
              in: {
                $switch: {
                  branches: [
                    // 1) 만료 최우선
                    { case: { $lte: ['$$exp', '$$NOW'] }, then: '만료' },
                    // 2) 결제취소 또는 패스 취소
                    { case: { $or: [{ $eq: ['$paymentStatus', '결제취소'] }, { $eq: ['$passDoc.status', 'cancelled'] }] }, then: '취소' },
                    // 3) 일시정지 또는 결제미완료 → 비활성
                    { case: { $or: [{ $eq: ['$passDoc.status', 'paused'] }, { $ne: ['$paymentStatus', '결제완료'] }] }, then: '비활성' },
                  ],
                  // 4) 그 외는 활성
                  default: '활성',
                },
              },
            },
          },
        },
      },

      // 계산된 상태로 서버-사이드 필터 (필요할 때만 붙이기)
      ...(status && status !== 'all' ? [{ $match: { passStatusKo: status } }] : []),

      // 고객 표시용 필드
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

      { $sort: sortDoc },

      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: limit },
            // facet > items > $project 에서 날짜를 문자열로 직렬화
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

                purchaseDate: {
                  $ifNull: [{ $dateToString: { date: '$purchaseDate', format: '%Y-%m-%dT%H:%M:%S.%LZ', timezone: 'UTC' } }, null],
                },
                expiryDate: {
                  $ifNull: [{ $dateToString: { date: '$_calcExpiry', format: '%Y-%m-%dT%H:%M:%S.%LZ', timezone: 'UTC' } }, null],
                },

                passStatus: '$passStatusKo',
                status: '$status',
                paymentStatus: '$paymentStatus',
                serviceType: '$serviceType',
              },
            },
          ],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const agg = await col.aggregate(pipeline).toArray();
    const items = agg?.[0]?.items ?? [];
    const total = agg?.[0]?.total?.[0]?.count ?? 0;

    return NextResponse.json({ items, total, page, pageSize: limit });
  } catch (e) {
    console.error('[/api/package-orders] GET error', e);
    return NextResponse.json({ error: '서버 오류' }, { status: 500 });
  }
}
