import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { verifyAccessToken } from '@/lib/auth.utils';
import { ObjectId } from 'mongodb';

type Op = 'suspend' | 'unsuspend' | 'softDelete' | 'restore';

// verifyAccessToken은 throw 가능 → 안전하게 null 처리(500 방지)
function safeVerifyAccessToken(token?: string) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  // 1) 관리자 인증
  const token = (await cookies()).get('accessToken')?.value;
  const payload = safeVerifyAccessToken(token);
  if (!payload?.sub || payload.role !== 'admin') {
    return NextResponse.json({ message: 'forbidden' }, { status: 403 });
  }

  // 2) 입력 파싱
  const body = await req.json().catch(() => ({}));
  const { op, ids } = body as { op?: Op; ids?: string[] };
  if (!op || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ message: 'op and ids are required' }, { status: 400 });
  }

  // 3) ObjectId 유효성 검사
  const _ids = ids.filter(ObjectId.isValid).map((id) => new ObjectId(id));
  if (_ids.length === 0) {
    return NextResponse.json({ message: 'no valid ids' }, { status: 400 });
  }

  const db = await getDb();
  const col = db.collection('users');

  // 4) 현재 상태 미리 조회하여 분류(eligible / already / incompatible)
  const docs = await col.find({ _id: { $in: _ids } }, { projection: { _id: 1, isSuspended: 1, isDeleted: 1 } }).toArray();

  const eligible: ObjectId[] = []; // 실제 업데이트할 대상
  const already: ObjectId[] = []; // 이미 그 상태인 대상
  const incompatible: ObjectId[] = []; // 정책상 불가(예: 삭제된 계정에 비활성화)

  // 4-1) 연산별로 분기하여 분류 로직 적용
  for (const d of docs) {
    const suspended = !!(d as any).isSuspended;
    const deleted = !!(d as any).isDeleted;

    switch (op) {
      case 'suspend': {
        // 삭제된 계정은 비활성화 대상 아님 → incompatible
        if (deleted) incompatible.push(d._id);
        // 이미 비활성 → already
        else if (suspended) already.push(d._id);
        // 그 외 → eligible
        else eligible.push(d._id);
        break;
      }
      case 'unsuspend': {
        // 삭제된 계정의 비활성 해제는 정책상 불가로 간주 → incompatible
        if (deleted) incompatible.push(d._id);
        // 이미 활성(비활성 아님) → already
        else if (!suspended) already.push(d._id);
        // 그 외(현재 비활성) → eligible
        else eligible.push(d._id);
        break;
      }
      case 'softDelete': {
        // 이미 삭제 → already
        if (deleted) already.push(d._id);
        else eligible.push(d._id);
        break;
      }
      case 'restore': {
        // 정책: 복구 금지
        incompatible.push(d._id);
        break;
      }
      default:
        return NextResponse.json({ message: 'invalid op' }, { status: 400 });
    }
  }

  // 5) 실제 업데이트 연산 정의
  let $set: Record<string, any> = {};
  switch (op) {
    case 'suspend':
      $set = { isSuspended: true, suspendedAt: new Date() };
      break;
    case 'unsuspend':
      $set = { isSuspended: false, suspendedAt: null };
      break;
    case 'softDelete':
      $set = { isDeleted: true, deletedAt: new Date() };
      break;
    case 'restore':
      $set = { isDeleted: false, deletedAt: null };
      break;
  }

  // 6) eligible 에게만 updateMany 수행
  let modifiedCount = 0;
  if (eligible.length > 0) {
    const r = await col.updateMany({ _id: { $in: eligible } }, { $set });
    modifiedCount = r.modifiedCount;
  }

  // 7) 상세 결과 함께 반환
  return NextResponse.json({
    requested: _ids.length, // 요청 수
    found: docs.length, // DB에 실제 존재한 수
    eligible: eligible.length, // 실제 처리 대상 수
    modifiedCount, // 실제 변경된 수
    skipped: {
      already: already.map(String), // 이미 그 상태여서 스킵
      incompatible: incompatible.map(String), // 정책상 불가로 스킵
    },
    op,
  });
}
