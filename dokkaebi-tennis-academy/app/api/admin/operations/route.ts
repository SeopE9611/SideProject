import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/admin.guard';
import { toISO, normalizeOrderStatus, normalizePaymentStatus, normalizeRentalStatus, summarizeOrderItems, pickCustomerFromDoc, normalizeRentalAmountTotal } from '@/lib/admin-ops-normalize';
import type { AdminOperationFlow as Flow, AdminOperationItem as OpItem, AdminOperationKind as Kind, SettlementAnchor, AdminOperationsListRequestDto, AdminOperationsListResponseDto } from '@/types/admin/operations';
export const dynamic = 'force-dynamic';

/** Responsibility: transport + orchestration only (쿼리/집계 호출 및 응답). */


const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
const MAX_FETCH_EACH = 300; // 각 컬렉션에서 상위 N개만 가져온 뒤 merge/sort

// warn=1 (경고만 보기) 서버 필터
type OpGroup = {
  key: string;
  anchor: OpItem;
  createdAt: string | null;
  items: OpItem[]; // anchor 포함
};

const KIND_PRIORITY: Record<Kind, number> = {
  order: 0,
  rental: 1,
  stringing_application: 2,
};

type UnknownDoc = Record<string, unknown>;
type UnknownArray = UnknownDoc[];

function asObject(value: unknown): UnknownDoc | null {
  return typeof value === 'object' && value !== null ? (value as UnknownDoc) : null;
}

function asObjectArray(value: unknown): UnknownArray {
  return Array.isArray(value) ? value.filter((item): item is UnknownDoc => asObject(item) !== null) : [];
}

function getString(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return null;
}

function getIdString(value: unknown): string | null {
  const asString = getString(value);
  if (asString) return asString;
  const obj = asObject(value);
  if (!obj) return null;
  if (typeof obj.toString === 'function') return obj.toString();
  return null;
}

function hasRacketItems(items: unknown) {
  return asObjectArray(items).some((it) => it.kind === 'racket' || it.kind === 'used_racket');
}

function flowLabelOf(flow: Flow) {
  switch (flow) {
    case 1:
      return '스트링 단품 구매';
    case 2:
      return '스트링 구매 + 교체서비스 신청(통합)';
    case 3:
      return '교체서비스 단일 신청';
    case 4:
      return '라켓 단품 구매';
    case 5:
      return '라켓 구매 + 스트링 선택 + 교체서비스 신청(통합)';
    case 6:
      return '라켓 단품 대여';
    case 7:
      return '라켓 대여 + 스트링 선택 + 교체서비스 신청(통합)';
    default:
      return '미분류';
  }
}

function settlementLabelOf(anchor: SettlementAnchor) {
  // 화면에서 “금액=정산금액?” 혼동을 막기 위한 최소 라벨
  switch (anchor) {
    case 'order':
      return '정산: 주문';
    case 'rental':
      return '정산: 대여';
    case 'application':
      return '정산: 신청(단독)';
    default:
      return '정산: -';
  }
}

function orderFlowByHasRacket(hasRacket: boolean, integrated: boolean): Flow {
  if (integrated) return (hasRacket ? 5 : 2) as Flow;
  return (hasRacket ? 4 : 1) as Flow;
}

function rentalFlowByWithService(withService: boolean): Flow {
  return (withService ? 7 : 6) as Flow;
}

function groupKeyOf(it: OpItem): string {
  // 주문/대여는 자기 자신이 앵커
  if (it.kind === 'order') return `order:${it.id}`;
  if (it.kind === 'rental') return `rental:${it.id}`;

  // 신청서는 연결된 "주문/대여"를 앵커로
  const rel = it.related;
  if (rel?.kind === 'order') return `order:${rel.id}`;
  if (rel?.kind === 'rental') return `rental:${rel.id}`;
  // 단독 신청서
  return `app:${it.id}`;
}

function pickAnchor(groupItems: OpItem[]): OpItem {
  return groupItems.find((x) => x.kind === 'order') ?? groupItems.find((x) => x.kind === 'rental') ?? groupItems[0]!;
}

function summarizeByKind(items: OpItem[], getLabel: (it: OpItem) => string | undefined | null) {
  const map = new Map<Kind, Set<string>>();
  for (const it of items) {
    const v = getLabel(it);
    if (!v) continue;
    if (!map.has(it.kind)) map.set(it.kind, new Set());
    map.get(it.kind)!.add(String(v));
  }

  return (['order', 'rental', 'stringing_application'] as Kind[])
    .map((k) => {
      const labels = Array.from(map.get(k) ?? []);
      if (labels.length === 0) return null;
      return { kind: k, mixed: labels.length > 1, text: labels.length === 1 ? labels[0] : `${labels[0]} 외 ${labels.length - 1}` };
    })
    .filter(Boolean) as Array<{ kind: Kind; mixed: boolean; text: string }>;
}

function isWarnGroup(g: OpGroup) {
  const hasLinkWarn = (g.items ?? []).some((it) => (it.warnReasons?.length ?? 0) > 0);
  if (hasLinkWarn) return true;
  if (!g.items || g.items.length <= 1) return false;
  const anchorKey = `${g.anchor.kind}:${g.anchor.id}`;
  const children = g.items.filter((x) => `${x.kind}:${x.id}` !== anchorKey);
  if (children.length === 0) return false;

  const childStatusSummary = summarizeByKind(children, (it) => it.statusLabel);
  const childPaymentSummary = summarizeByKind(children, (it) => it.paymentLabel);
  const hasMixed = childStatusSummary.some((s) => s.mixed) || childPaymentSummary.some((p) => p.mixed);

  const anchorPay = g.anchor.paymentLabel ?? '-';
  const childPays = children.map((x) => x.paymentLabel).filter(Boolean) as string[];
  const payMismatch = anchorPay !== '-' && childPays.some((p) => p && p !== '-' && p !== anchorPay);

  return payMismatch || hasMixed;
}

function filterWarnGroups(list: OpItem[]): OpItem[] {
  const map = new Map<string, OpItem[]>();
  for (const it of list) {
    const key = groupKeyOf(it);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(it);
  }

  const groups: OpGroup[] = Array.from(map.entries()).map(([key, items]) => {
    items.sort((a, b) => KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind]);
    const anchor = pickAnchor(items);
    const ts = Math.max(...items.map((x) => (x.createdAt ? new Date(x.createdAt).getTime() : 0)));
    const createdAt = ts ? new Date(ts).toISOString() : null;
    return { key, anchor, createdAt, items };
  });

  const warnGroups = groups.filter((g) => isWarnGroup(g));

  // 그룹 최신순(운영자가 "최근 경고"부터 본다)
  warnGroups.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  // 그룹 내부는 kind 우선순위(주문 → 대여 → 신청서)
  return warnGroups.flatMap((g) => g.items);
}

function parseIntegrated(v: string | null): boolean | null {
  // integrated=1 (통합만) / integrated=0 (단독만)
  if (v === '1') return true;
  if (v === '0') return false;
  return null;
}

function parseFlow(v: string | null): Flow | null {
  if (!v) return null;
  const n = Number(v);
  if (!Number.isInteger(n)) return null;
  if (n < 1 || n > 7) return null;
  return n as Flow;
}

function parseIntParam(v: string | null, opts: { defaultValue: number; min: number; max: number }) {
  const n = Number(v);
  const base = Number.isFinite(n) ? n : opts.defaultValue;
  return Math.min(opts.max, Math.max(opts.min, Math.trunc(base)));
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const { db } = guard;

  const url = new URL(req.url);
  const page = parseIntParam(url.searchParams.get('page'), { defaultValue: 1, min: 1, max: 10_000 });
  const pageSize = parseIntParam(url.searchParams.get('pageSize'), { defaultValue: DEFAULT_PAGE_SIZE, min: 1, max: MAX_PAGE_SIZE });
  const kind = (url.searchParams.get('kind') as Kind | 'all' | null) ?? 'all';
  const q = String(url.searchParams.get('q') ?? '')
    .trim()
    .toLowerCase();
  const warn = url.searchParams.get('warn') === '1';
  const flow = parseFlow(url.searchParams.get('flow'));
  const integrated = parseIntegrated(url.searchParams.get('integrated'));
  const requestDto: AdminOperationsListRequestDto = { page, pageSize, kind, q, warn, flow, integrated };

  // 1) 신청서 먼저 조회해서 “연결 매핑(orderId/rentalId)”을 만든다.
  const rawApps = await db
    .collection('stringing_applications')
    .find({ status: { $ne: 'draft' } })
    .project({
      _id: 1,
      createdAt: 1,
      status: 1,
      paymentStatus: 1,
      stringingApplicationId: 1,
      totalPrice: 1,
      serviceAmount: 1,
      orderId: 1,
      rentalId: 1,
      customer: 1,
      userSnapshot: 1,
      guestName: 1,
      guestEmail: 1,
    })
    .sort({ createdAt: -1 })
    .limit(MAX_FETCH_EACH)
    .toArray();

  const orderToApp = new Map<string, string>();
  const rentalToApp = new Map<string, string>();
  for (const a of rawApps) {
    const appId = getIdString(a?._id);
    const orderId = getIdString(a?.orderId);
    const rentalId = getIdString(a?.rentalId);
    if (orderId && appId) orderToApp.set(orderId, appId);
    if (rentalId && appId) rentalToApp.set(rentalId, appId);
  }

  // 경고용: orderId/rentalId 기준으로 신청서가 “여러 개” 붙는 경우까지 집계(기존 orderToApp/rentalToApp은 1개만 매핑)
  const orderToAppIds = new Map<string, string[]>();
  const rentalToAppIds = new Map<string, string[]>();
  for (const a of asObjectArray(rawApps)) {
    const orderId = getIdString(a?.orderId);
    const rentalId = getIdString(a?.rentalId);
    const appId = getIdString(a?._id);
    if (orderId && appId) {
      const key = orderId;
      const arr = orderToAppIds.get(key) ?? [];
      arr.push(appId);
      orderToAppIds.set(key, arr);
    }
    if (rentalId && appId) {
      const key = rentalId;
      const arr = rentalToAppIds.get(key) ?? [];
      arr.push(appId);
      rentalToAppIds.set(key, arr);
    }
  }

  // 2) 주문 조회
  const rawOrders = await db
    .collection('orders')
    .find({})
    .project({
      _id: 1,
      createdAt: 1,
      status: 1,
      paymentStatus: 1,
      isStringServiceApplied: 1,
      stringingApplicationId: 1,
      totalPrice: 1,
      customer: 1,
      userSnapshot: 1,
      guestInfo: 1,
      items: 1,
    })
    .sort({ createdAt: -1 })
    .limit(MAX_FETCH_EACH)
    .toArray();

  // 3) 대여 조회(+ userId 배치 매핑: 고객명/이메일 정확도 향상)
  const rawRentals = await db
    .collection('rental_orders')
    .find({})
    .project({
      _id: 1,
      createdAt: 1,
      status: 1,
      userId: 1,
      guest: 1,
      brand: 1,
      model: 1,
      days: 1,
      period: 1,
      amount: 1,
      fee: 1,
      deposit: 1,
      stringing: 1,
      stringingApplicationId: 1,
      isStringServiceApplied: 1,
    })
    .sort({ createdAt: -1 })
    .limit(MAX_FETCH_EACH)
    .toArray();

  /**
   * 3-1) MAX_FETCH_EACH 컷 보강
   *
   * rawApps는 "신청서 상위 N개"만 가져오므로,
   * - 화면에 보이는 주문/대여(rawOrders/rawRentals)에는 신청서가 실제로 연결되어 있는데
   * - rawApps에 그 신청서가 포함되지 않아
   *   (1) 단독/통합 판정이 틀어지거나
   *   (2) "주문.stringingApplicationId가 가리키는 신청서를 DB에서 찾지 못했습니다" 같은 오탐 경고가 생기는 현상 발견.
   *
   * 따라서 "현재 응답 범위의 주문/대여"를 기준으로 연결된 신청서를 추가 조회하여(rawApps + 매핑) 보강함
   */
  const linkOr: Array<Record<string, unknown>> = [];
  if (rawOrders.length > 0) {
    const orderIds = rawOrders.map((o) => o?._id).filter(Boolean);
    if (orderIds.length > 0) linkOr.push({ orderId: { $in: orderIds } });
  }
  if (rawRentals.length > 0) {
    const rentalIds = rawRentals.map((r) => r?._id).filter(Boolean);
    if (rentalIds.length > 0) linkOr.push({ rentalId: { $in: rentalIds } });
  }

  if (linkOr.length > 0) {
    const extraLinkedApps = await db
      .collection('stringing_applications')
      .find({ status: { $ne: 'draft' }, $or: linkOr })
      .project({
        _id: 1,
        createdAt: 1,
        status: 1,
        paymentStatus: 1,
        stringingApplicationId: 1,
        totalPrice: 1,
        serviceAmount: 1,
        orderId: 1,
        rentalId: 1,
        customer: 1,
        userSnapshot: 1,
        guestName: 1,
        guestEmail: 1,
      })
      .toArray();

    // rawApps에 없는 신청서만 추가 + 매핑 보강
    const existingAppIds = new Set(rawApps.map((a) => String(a?._id)));
    for (const a of asObjectArray(extraLinkedApps)) {
      const aid = String(a?._id);
      if (!aid) continue;

      // 1) rawApps에 없으면 추가(목록/정렬은 아래 merge 단계에서 createdAt 기준으로 재정렬됨)
      if (!existingAppIds.has(aid)) {
        rawApps.push(a);
        existingAppIds.add(aid);
      }

      // 2) 주문/대여 → 신청서 매핑 보강(단독/통합 판정 + 경고 계산 정확도 향상)
      if (a?.orderId) {
        const oid = String(a.orderId);
        if (oid) {
          // orderToApp은 "대표 1개"만 가지므로 기존 값이 있으면 덮어쓰지 않음(최신값 유지 의도)
          if (!orderToApp.has(oid)) orderToApp.set(oid, aid);
          const arr = orderToAppIds.get(oid) ?? [];
          if (!arr.includes(aid)) {
            arr.push(aid);
            orderToAppIds.set(oid, arr);
          }
        }
      }
      if (a?.rentalId) {
        const rid = String(a.rentalId);
        if (rid) {
          if (!rentalToApp.has(rid)) rentalToApp.set(rid, aid);
          const arr = rentalToAppIds.get(rid) ?? [];
          if (!arr.includes(aid)) {
            arr.push(aid);
            rentalToAppIds.set(rid, arr);
          }
        }
      }
    }
  }

  const userIds = Array.from(new Set(rawRentals.map((r) => r?.userId).filter(Boolean)));
  const userMap = new Map<string, { name?: string; email?: string }>();
  if (userIds.length > 0) {
    const users = await db
      .collection('users')
      .find({ _id: { $in: userIds.map((id) => (ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : id)) } })
      .project({ name: 1, email: 1 })
      .toArray();
    users.forEach((u) => userMap.set(String(u._id), { name: u.name, email: u.email }));
  }

  // 주문 아이템에서 '라켓 포함 여부'를 미리 계산해두면,
  // 신청서가 주문에 연결된 경우에도(Flow 2 vs 5) 정확히 판정가능
  const orderHasRacket = new Map<string, boolean>();
  for (const o of rawOrders) {
    orderHasRacket.set(String(o?._id), hasRacketItems(o?.items));
  }

  // 3) 연결 무결성(양방향 링크) 경고 사유 계산
  const appById = new Map<string, UnknownDoc>(asObjectArray(rawApps).map((a) => [String(a._id), a]));
  const warnByKey = new Map<string, string[]>();
  const pushWarn = (kind: Kind, id: string, reason: string) => {
    const key = `${kind}:${id}`;
    const arr = warnByKey.get(key) ?? [];
    if (!arr.includes(reason)) arr.push(reason);
    warnByKey.set(key, arr);
  };

  const pendingByKey = new Map<string, string[]>();
  const pushPending = (kind: Kind, id: string, reason: string) => {
    const key = `${kind}:${id}`;
    const arr = pendingByKey.get(key) ?? [];
    if (!arr.includes(reason)) arr.push(reason);
    pendingByKey.set(key, arr);
  };

  // '작성대기' 판정: 주문/대여가 stringingApplicationId로 신청서를 가리키지만,
  // rawApps는 status != 'draft' 조건으로 가져오므로(초안은 제외),
  // 'DB에서 못 찾음'이 아니라 '초안 작성대기'로 분류해야 하는 케이스가 생긴다.
  const draftById = new Map<string, UnknownDoc>();
  {
    const candidateIds = new Set<string>();
    for (const o of rawOrders) {
      if (o?.stringingApplicationId) candidateIds.add(String(o.stringingApplicationId));
    }
    for (const r of rawRentals) {
      if (r?.stringingApplicationId) candidateIds.add(String(r.stringingApplicationId));
    }

    const missingIds = Array.from(candidateIds).filter((id) => !appById.has(id));
    if (missingIds.length > 0) {
      const objectIds = missingIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));

      if (objectIds.length > 0) {
        const rawDrafts = await db
          .collection('stringing_applications')
          .find({ _id: { $in: objectIds }, status: 'draft' })
          .project({ _id: 1, status: 1, orderId: 1, rentalId: 1, createdAt: 1 })
          .toArray();
        for (const d of asObjectArray(rawDrafts)) {
          draftById.set(String(d._id), d);
        }
      }
    }
  }

  // 주문 ↔ 신청서(교체서비스) 양방향 체크
  for (const o of rawOrders) {
    const oid = String(o._id);
    const appIdsFromApps = orderToAppIds.get(oid) ?? [];
    const appIdInOrder = o?.stringingApplicationId ? String(o.stringingApplicationId) : null;

    if (appIdsFromApps.length > 1) {
      pushWarn('order', oid, `주문에 연결된 신청서가 ${appIdsFromApps.length}개입니다(중복/분기 오류 가능).`);
    }
    if (appIdsFromApps.length > 0 && !appIdInOrder) {
      pushWarn('order', oid, '신청서→주문 연결은 존재하지만 주문.stringingApplicationId가 비어있습니다(역방향 링크 누락).');
    }

    if (appIdInOrder) {
      const a = appById.get(appIdInOrder);
      if (!a) {
        const d = draftById.get(appIdInOrder);
        if (d) {
          pushPending('order', oid, '교체서비스 신청서가 초안(draft) 상태입니다(작성대기).');
        } else {
          // 사용자가 신청을 "아예 진행하지 않은/완료하지 않은" 케이스까지 무조건 오류로 잡으면 오탐.
          // - 주문이 "신청 완료" 상태라고 명시(isStringServiceApplied=true)했거나
          // - 신청서 컬렉션에서 해당 주문으로 연결된 신청서(appIdsFromApps)가 실제로 존재하는데
          //   주문이 그걸 못 가리키는 상황이면 => 진짜 연결 오류
          // 그 외에는 "미신청/작성 전"으로 보고 pending으로 분류한다.
          const orderClaimsApplied = Boolean(o?.isStringServiceApplied);
          if (!orderClaimsApplied && appIdsFromApps.length === 0) {
            pushPending('order', oid, '교체서비스 신청이 아직 제출되지 않았습니다(미신청/작성 전).');
          } else {
            pushWarn('order', oid, '주문.stringingApplicationId가 가리키는 신청서를 DB에서 찾지 못했습니다.');
          }
        }
      } else {
        const aOrderId = a?.orderId ? String(a.orderId) : '';
        if (aOrderId && aOrderId !== oid) {
          pushWarn('order', oid, '주문↔신청서 연결이 불일치합니다(신청서.orderId가 이 주문을 가리키지 않음).');
          pushWarn('stringing_application', String(a._id), '신청서.orderId가 주문과 불일치합니다(주문.stringingApplicationId와 양방향 아님).');
        }
      }
      if (appIdsFromApps.length > 0 && !appIdsFromApps.includes(appIdInOrder)) {
        pushWarn('order', oid, '주문.stringingApplicationId와 신청서.orderId 매핑이 일치하지 않습니다.');
      }
    }
  }

  // 대여 ↔ 신청서(교체서비스) 양방향 체크
  for (const r of rawRentals) {
    const rid = String(r._id);
    const appIdsFromApps = rentalToAppIds.get(rid) ?? [];
    const appIdInRental = r?.stringingApplicationId ? String(r.stringingApplicationId) : null;

    if (appIdsFromApps.length > 1) {
      pushWarn('rental', rid, `대여에 연결된 신청서가 ${appIdsFromApps.length}개입니다(중복/분기 오류 가능).`);
    }
    if (appIdsFromApps.length > 0 && !appIdInRental) {
      pushWarn('rental', rid, '신청서→대여 연결은 존재하지만 대여.stringingApplicationId가 비어있습니다(역방향 링크 누락).');
    }

    if (appIdInRental) {
      const a = appById.get(appIdInRental);
      if (!a) {
        const d = draftById.get(appIdInRental);
        if (d) {
          pushPending('rental', rid, '교체서비스 신청서가 초안(draft) 상태입니다(작성대기).');
        } else {
          const rentalClaimsApplied = Boolean(r?.isStringServiceApplied);
          if (!rentalClaimsApplied && appIdsFromApps.length === 0) {
            pushPending('rental', rid, '교체서비스 신청이 아직 제출되지 않았습니다(미신청/작성 전).');
          } else {
            pushWarn('rental', rid, '대여.stringingApplicationId가 가리키는 신청서를 DB에서 찾지 못했습니다.');
          }
        }
      } else {
        const aRentalId = a?.rentalId ? String(a.rentalId) : '';
        if (aRentalId && aRentalId !== rid) {
          pushWarn('rental', rid, '대여↔신청서 연결이 불일치합니다(신청서.rentalId가 이 대여를 가리키지 않음).');
          pushWarn('stringing_application', String(a._id), '신청서.rentalId가 대여와 불일치합니다(대여.stringingApplicationId와 양방향 아님).');
        }
      }
      if (appIdsFromApps.length > 0 && !appIdsFromApps.includes(appIdInRental)) {
        pushWarn('rental', rid, '대여.stringingApplicationId와 신청서.rentalId 매핑이 일치하지 않습니다.');
      }
    }
  }

  // 신청서 기준: 존재성 + 역방향 링크
  for (const a of asObjectArray(rawApps)) {
    const aid = String(a._id);

    const oid = a?.orderId ? String(a.orderId) : null;
    if (oid) {
      const o = rawOrders.find((x) => String(x._id) === oid);
      if (!o) {
        pushWarn('stringing_application', aid, '신청서.orderId가 가리키는 주문이 DB에 없습니다.');
      } else {
        const back = o?.stringingApplicationId ? String(o.stringingApplicationId) : null;
        if (!back) {
          pushWarn('stringing_application', aid, '신청서→주문은 연결되어 있으나 주문.stringingApplicationId가 비어있습니다(역방향 링크 누락).');
        } else if (back !== aid) {
          pushWarn('stringing_application', aid, '주문.stringingApplicationId가 다른 신청서를 가리킵니다(양방향 링크 불일치).');
        }
      }
    }

    const rid = a?.rentalId ? String(a.rentalId) : null;
    if (rid) {
      const r = rawRentals.find((x) => String(x._id) === rid);
      if (!r) {
        pushWarn('stringing_application', aid, '신청서.rentalId가 가리키는 대여가 DB에 없습니다.');
      } else {
        const back = r?.stringingApplicationId ? String(r.stringingApplicationId) : null;
        if (!back) {
          pushWarn('stringing_application', aid, '신청서→대여는 연결되어 있으나 대여.stringingApplicationId가 비어있습니다(역방향 링크 누락).');
        } else if (back !== aid) {
          pushWarn('stringing_application', aid, '대여.stringingApplicationId가 다른 신청서를 가리킵니다(양방향 링크 불일치).');
        }
      }
    }
  }

  // 4) 공통 포맷으로 매핑
  const orderItems: OpItem[] = rawOrders.map((o) => {
    const id = String(o._id);
    const cust = pickCustomerFromDoc(o);
    const appId = orderToApp.get(id) ?? null;
    const isIntegrated = !!appId;
    return {
      id,
      kind: 'order',
      createdAt: toISO(o.createdAt),
      customer: cust,
      title: summarizeOrderItems(o.items),
      statusLabel: normalizeOrderStatus(o.status),
      paymentLabel: normalizePaymentStatus(o.paymentStatus),
      amount: Number(o.totalPrice ?? 0),
      flow: orderFlowByHasRacket(orderHasRacket.get(id) ?? false, isIntegrated),
      flowLabel: flowLabelOf(orderFlowByHasRacket(orderHasRacket.get(id) ?? false, isIntegrated)),
      settlementAnchor: 'order',
      settlementLabel: settlementLabelOf('order'),
      href: `/admin/orders/${id}`,
      related: appId ? { kind: 'stringing_application', id: appId, href: `/admin/applications/stringing/${appId}` } : null,
      isIntegrated,
      warnReasons: warnByKey.get(`order:${id}`) ?? [],
      pendingReasons: pendingByKey.get(`order:${id}`) ?? [],
    };
  });

  const appItems: OpItem[] = asObjectArray(rawApps).map((a) => {
    const id = String(a._id);
    const cust = pickCustomerFromDoc(a);
    const linkedOrderId = a?.orderId ? String(a.orderId) : null;
    const linkedRentalId = a?.rentalId ? String(a.rentalId) : null;
    const isIntegrated = !!(linkedOrderId || linkedRentalId);

    // 신청서는 상세/정산에서 “가격 누락”이 치명적이므로,
    // totalPrice 우선, 없으면 serviceAmount로 보완.
    const amount = Number(a?.totalPrice ?? a?.serviceAmount ?? 0);

    // 연결 우선순위: 주문 연결 > 대여 연결 (필요 시 UX 기준으로 바꿔도 됨)
    const related = linkedOrderId ? { kind: 'order' as const, id: linkedOrderId, href: `/admin/orders/${linkedOrderId}` } : linkedRentalId ? { kind: 'rental' as const, id: linkedRentalId, href: `/admin/rentals/${linkedRentalId}` } : null;

    return {
      id,
      kind: 'stringing_application',
      createdAt: toISO(a.createdAt),
      customer: cust,
      title: '교체 서비스 신청',
      statusLabel: String(a?.status ?? '접수완료'),
      paymentLabel: normalizePaymentStatus(getString(a?.paymentStatus)),
      amount,
      flow: (() => {
        if (!isIntegrated) return 3 as Flow;
        if (related?.kind === 'order') return orderFlowByHasRacket(orderHasRacket.get(String(related.id)) ?? false, true);
        if (related?.kind === 'rental') return 7 as Flow;
        return 3 as Flow;
      })(),
      flowLabel: (() => {
        const f = (() => {
          if (!isIntegrated) return 3 as Flow;
          if (related?.kind === 'order') return orderFlowByHasRacket(orderHasRacket.get(String(related.id)) ?? false, true);
          if (related?.kind === 'rental') return 7 as Flow;
          return 3 as Flow;
        })();
        return flowLabelOf(f);
      })(),
      settlementAnchor: (() => {
        // 통합 신청서는 정산이 “앵커(주문/대여)”로 잡히는 것이 원칙
        if (!isIntegrated) return 'application' as SettlementAnchor;
        if (related?.kind === 'order') return 'order' as SettlementAnchor;
        if (related?.kind === 'rental') return 'rental' as SettlementAnchor;
        return 'application' as SettlementAnchor;
      })(),
      settlementLabel: (() => {
        const anchor = (() => {
          if (!isIntegrated) return 'application' as SettlementAnchor;
          if (related?.kind === 'order') return 'order' as SettlementAnchor;
          if (related?.kind === 'rental') return 'rental' as SettlementAnchor;
          return 'application' as SettlementAnchor;
        })();
        return settlementLabelOf(anchor);
      })(),
      href: `/admin/applications/stringing/${id}`,
      related,
      isIntegrated,
      warnReasons: warnByKey.get(`stringing_application:${id}`) ?? [],
      pendingReasons: pendingByKey.get(`stringing_application:${id}`) ?? [],
    };
  });

  const rentalItems: OpItem[] = rawRentals.map((r) => {
    const id = String(r._id);
    const u = r?.userId ? userMap.get(String(r.userId)) : null;
    const cust = u?.name || u?.email ? { name: String(u?.name ?? ''), email: String(u?.email ?? '') } : pickCustomerFromDoc(r);
    const rawAppId = r?.stringingApplicationId ?? null;
    const stringingApplicationId = rawAppId ? getIdString(rawAppId) : null;
    const appId = stringingApplicationId || (rentalToApp.get(id) ?? null);
    const withStringService = Boolean(r?.stringing?.requested) || Boolean(r?.isStringServiceApplied) || Boolean(appId);
    const isIntegrated = Boolean(appId);
    const days = Number(r?.days ?? r?.period ?? 0);
    const amount = normalizeRentalAmountTotal(r);

    return {
      id,
      kind: 'rental',
      createdAt: toISO(r.createdAt),
      customer: cust,
      title: `${String(r?.brand ?? '')} ${String(r?.model ?? '')}`.trim() + (days ? ` (${days}일)` : ''),
      statusLabel: normalizeRentalStatus(r?.status),
      amount,
      flow: rentalFlowByWithService(withStringService),
      flowLabel: flowLabelOf(rentalFlowByWithService(withStringService)),
      settlementAnchor: 'rental',
      settlementLabel: settlementLabelOf('rental'),
      href: `/admin/rentals/${id}`,
      related: appId ? { kind: 'stringing_application', id: appId, href: `/admin/applications/stringing/${appId}` } : null,
      isIntegrated,
      warnReasons: warnByKey.get(`rental:${id}`) ?? [],
      pendingReasons: pendingByKey.get(`rental:${id}`) ?? [],
    };
  });

  // 5) 병합 → 최신순 정렬 → kind/q 필터 → 페이지 슬라이스
  let merged: OpItem[] = [...orderItems, ...appItems, ...rentalItems].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  if (kind !== 'all') merged = merged.filter((x) => x.kind === kind);

  if (q) {
    merged = merged.filter((x) => {
      const idMatch = x.id.toLowerCase().includes(q);
      const nameMatch = (x.customer?.name ?? '').toLowerCase().includes(q);
      const emailMatch = (x.customer?.email ?? '').toLowerCase().includes(q);
      const titleMatch = (x.title ?? '').toLowerCase().includes(q);
      return idMatch || nameMatch || emailMatch || titleMatch;
    });
  }

  // flow=1..7 (시나리오) 필터
  // - "그룹(통합)"의 구성(앵커/하위)을 깨지 않기 위해, '그룹 키' 기준으로 통째로 남긴다.
  // - 즉, 해당 그룹의 어떤 문서든 flow가 매칭되면 같은 그룹 키의 문서를 같이 남긴다.
  if (flow) {
    const allowedKeys = new Set<string>();
    for (const it of merged) {
      if (it.flow === flow) allowedKeys.add(groupKeyOf(it));
    }
    merged = merged.filter((it) => allowedKeys.has(groupKeyOf(it)));
  }

  // integrated=1/0 (통합/단독) 필터
  // - 그룹 키 기준으로 통째로 남김(앵커/하위 깨짐 방지)
  if (integrated !== null) {
    const groupIntegrated = new Map<string, boolean>();
    // 기본값 false로 두고, 그룹 내에 isIntegrated=true가 하나라도 있으면 true
    for (const it of merged) {
      const key = groupKeyOf(it);
      const prev = groupIntegrated.get(key) ?? false;
      if (prev) continue;
      if (it.isIntegrated) groupIntegrated.set(key, true);
      else groupIntegrated.set(key, prev);
    }
    const allowedKeys = new Set<string>();
    for (const [key, isInt] of groupIntegrated.entries()) {
      if (isInt === integrated) allowedKeys.add(key);
    }
    merged = merged.filter((it) => allowedKeys.has(groupKeyOf(it)));
  }

  // warn=1이면 서버에서 "경고 그룹"만 남긴 뒤 페이지네이션
  if (warn) merged = filterWarnGroups(merged);

  const { page: requestedPage, pageSize: requestedPageSize } = requestDto;
  const total = merged.length;
  const start = (requestedPage - 1) * requestedPageSize;
  const items = merged.slice(start, start + requestedPageSize);

  const responseDto: AdminOperationsListResponseDto = {
    items: items.map((item) => ({ ...item, createdAt: item.createdAt ?? null })),
    total,
  };
  return NextResponse.json(responseDto);
}
