// // runtime: nodejs, dynamic: force-dynamic 유지
// export const dynamic = 'force-dynamic';

// import { NextResponse } from 'next/server';
// import clientPromise from '@/lib/mongodb';
// import { cookies } from 'next/headers';
// import { verifyAccessToken } from '@/lib/auth.utils';

// /**
//  * 관리자 전용: 오래된 created 대여신청 삭제
//  * - 기본 2시간 이전(createdAt < now-2h)
//  * - 쿼리로 시간 조정 가능: ?hours=1 (1시간)
//  */
// export async function POST(req: Request) {
//   try {
//     // 1) 관리자 인증: JWT 쿠키 검사
//     const jar = await cookies();
//     const at = jar.get('accessToken')?.value;
//     const payload = at ? verifyAccessToken(at) : null;
//     if (!payload || payload.role !== 'admin') {
//       return NextResponse.json({ ok: false, message: 'UNAUTHORIZED' }, { status: 401 });
//     }

//     // 2) 파라미터(hours) 파싱 (기본 2시간)
//     const url = new URL(req.url);
//     const hours = Math.max(0.5, Number(url.searchParams.get('hours') ?? 2)); // 최소 30분
//     const limit = new Date(Date.now() - hours * 60 * 60 * 1000);

//     // 3) 삭제 실행
//     const db = (await clientPromise).db();
//     const r = await db.collection('rental_orders').deleteMany({
//       status: 'created',
//       createdAt: { $lt: limit },
//     });

//     return NextResponse.json({ ok: true, hours, deleted: r.deletedCount ?? 0 });
//   } catch (e) {
//     console.error('cleanup-created error', e);
//     return NextResponse.json({ ok: false, message: 'SERVER_ERROR' }, { status: 500 });
//   }
// }
