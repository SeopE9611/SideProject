import { ObjectId, type ClientSession, type Db } from "mongodb";
import { getMongoDatabase } from "@/lib/mongodb";
import type { AdminAuditHistoryItem } from "@/features/admin-audit/admin-audit.types";
import type { AdminPrincipal } from "@/features/admin-auth/admin-auth.types";
import { isAdminRole } from "@/features/admin-auth/admin-auth.types";
import {
  siteContentAuditActions,
  siteContentAuditChangedFields,
  type SiteContentAuditAction,
  type SiteContentAuditChangedField,
} from "./site-content.audit";
import type {
  ContactInformationContent,
  FacilityOverviewContent,
  GreetingContent,
  SiteContentKey,
} from "./site-content.types";

export const SITE_CONTENT_AUDIT_COLLECTION_NAME = "site_content_audit_events";
type Snapshot = FacilityOverviewContent | GreetingContent | ContactInformationContent;
type AuditDocument = {
  _id: ObjectId;
  siteContentKey: SiteContentKey;
  action: SiteContentAuditAction;
  actor: {
    adminId: ObjectId;
    displayName: string;
    role: AdminPrincipal["role"];
  };
  occurredAt: Date;
  fromVersionAt: Date | null;
  toVersionAt: Date;
  before: Snapshot | null;
  after: Snapshot;
  changedFields: SiteContentAuditChangedField[];
};

export async function insertSiteContentAuditEvent(input: {
  database: Db;
  session: ClientSession;
  eventId: ObjectId;
  siteContentKey: SiteContentKey;
  action: SiteContentAuditAction;
  actor: AdminPrincipal;
  occurredAt: Date;
  fromVersionAt: Date | null;
  toVersionAt: Date;
  before: Snapshot | null;
  after: Snapshot;
  changedFields: readonly SiteContentAuditChangedField[];
}): Promise<void> {
  if (!ObjectId.isValid(input.actor.id) || !input.actor.displayName.trim() || !isAdminRole(input.actor.role))
    throw new Error("감사 이벤트 관리자 정보가 유효하지 않습니다.");
  await input.database.collection<AuditDocument>(SITE_CONTENT_AUDIT_COLLECTION_NAME).insertOne(
    {
      _id: input.eventId,
      siteContentKey: input.siteContentKey,
      action: input.action,
      actor: {
        adminId: new ObjectId(input.actor.id),
        displayName: input.actor.displayName.trim(),
        role: input.actor.role,
      },
      occurredAt: input.occurredAt,
      fromVersionAt: input.fromVersionAt,
      toVersionAt: input.toVersionAt,
      before: input.before,
      after: input.after,
      changedFields: [...input.changedFields],
    },
    { session: input.session },
  );
}

const actionLabels = {
  created: "공식 콘텐츠 생성",
  updated: "공식 콘텐츠 수정",
} as const;
const fieldLabels: Record<SiteContentAuditChangedField, string> = {
  pageDescription: "페이지 설명",
  facts: "시설 기본 정보",
  principles: "함께 사는 기준",
  scenes: "생활의 모습",
  policy: "공개 원칙",
  notice: "공개 안내",
  statusLabel: "상태 문구",
  title: "제목",
  paragraphs: "인사말 본문",
  signerRole: "서명 직책",
  signerName: "서명 이름",
  showSignerName: "이름 공개 여부",
  directionsPageDescription: "찾아오시는 길 페이지 설명",
  address: "시설 주소",
  phone: "대표 전화",
  visitGuidance: "방문 전 문의 안내",
  contactPageDescription: "문의하기 페이지 설명",
  contactIntroduction: "문의 경로 소개",
  instagram: "인스타그램 공개 설정",
};

export async function listAdminSiteContentAuditHistory(input: {
  key: SiteContentKey;
  limit?: number;
}): Promise<AdminAuditHistoryItem[]> {
  const documents = await (
    await getMongoDatabase()
  )
    .collection<Partial<AuditDocument>>(SITE_CONTENT_AUDIT_COLLECTION_NAME)
    .find(
      { siteContentKey: input.key },
      {
        projection: {
          action: 1,
          "actor.displayName": 1,
          occurredAt: 1,
          changedFields: 1,
        },
      },
    )
    .sort({ occurredAt: -1, _id: -1 })
    .limit(Math.min(50, Math.max(1, input.limit ?? 50)))
    .toArray();
  return documents.flatMap((event) => {
    if (
      !(event._id instanceof ObjectId) ||
      !(event.occurredAt instanceof Date) ||
      Number.isNaN(event.occurredAt.getTime()) ||
      typeof event.action !== "string" ||
      !siteContentAuditActions.includes(event.action as SiteContentAuditAction) ||
      typeof event.actor?.displayName !== "string" ||
      !Array.isArray(event.changedFields) ||
      !event.changedFields.every((field) => siteContentAuditChangedFields.includes(field))
    ) {
      console.error("공식 콘텐츠 감사 이벤트 검증 실패", {
        siteContentKey: input.key,
        errorName: "InvalidAuditEvent",
      });
      return [];
    }
    return [
      {
        id: event._id.toHexString(),
        actionLabel: actionLabels[event.action as SiteContentAuditAction],
        actorDisplayName: event.actor.displayName.trim(),
        occurredAt: event.occurredAt.toISOString(),
        changedFieldLabels: event.changedFields.map((field) => fieldLabels[field]),
      },
    ];
  });
}
