import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin.guard';
import { verifyAdminCsrf } from '@/lib/admin/verifyAdminCsrf';
import { adminValidationError, zodIssuesToDetails } from '@/lib/admin/adminApiError';


const MAX_BULK_IDS = 200;

const bulkBodySchema = z
  .object({
    op: z.enum(['suspend', 'unsuspend', 'softDelete', 'restore']),
    ids: z.array(z.string()).max(MAX_BULK_IDS, `ids는 최대 ${MAX_BULK_IDS}개까지 요청할 수 있습니다.`),
  })
  .strict();

function normalizeIds(rawIds: string[]) {
  const deduped: string[] = [];
  const seen = new Set<string>();
  const invalidObjectIds: { index: number; value: string; reason: string }[] = [];

  for (let index = 0; index < rawIds.length; index += 1) {
    const normalized = rawIds[index].trim();
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    if (!ObjectId.isValid(normalized)) {
      invalidObjectIds.push({
        index,
        value: normalized,
        reason: 'ObjectId 형식이 아닙니다.',
      });
      continue;
    }

    deduped.push(normalized);
  }

  return { deduped, invalidObjectIds };
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  // 2) 입력 파싱
  const body = await req.json().catch(() => null);
  const parsedBody = bulkBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return adminValidationError('요청 본문이 올바르지 않습니다.', parsedBody.error.flatten().fieldErrors, zodIssuesToDetails(parsedBody.error.issues));
  }

  const { op, ids } = parsedBody.data;

  // 3) ids 정규화(빈값 제거/중복 제거/ObjectId 상세 검증)
  const { deduped, invalidObjectIds } = normalizeIds(ids);

  if (invalidObjectIds.length > 0) {
    return adminValidationError(
      'ids에 유효하지 않은 ObjectId가 포함되어 있습니다.',
      {
        ids: invalidObjectIds.map((item) => `index ${item.index}: ${item.value} (${item.reason})`),
      },
      invalidObjectIds.map((item) => ({
        code: 'INVALID_OBJECT_ID',
        message: item.reason,
        path: `ids.${item.index}`,
      })),
    );
  }

  if (deduped.length === 0) {
    return adminValidationError('ids에 처리 가능한 값이 없습니다.', { ids: ['빈 문자열을 제외한 유효한 ID를 1개 이상 전달해주세요.'] });
  }

  const _ids = deduped.map((id) => new ObjectId(id));

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
        return adminValidationError('지원하지 않는 작업입니다.', { op: ['허용된 op 값이 아닙니다.'] });
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
