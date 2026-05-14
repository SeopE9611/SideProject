import { NextResponse } from "next/server";
import { ObjectId, type Document, type Filter } from "mongodb";

import { verifyAdminCsrf } from "@/lib/admin/verifyAdminCsrf";
import { requireAdmin } from "@/lib/admin.guard";

const COLLECTION_NAME = "academy_classes";
const APPLICATION_COLLECTION_NAME = "academy_lesson_applications";

function buildClassApplicationFilter(classId: string): Filter<Document> {
  const matchers: unknown[] = [classId];
  if (ObjectId.isValid(classId)) {
    matchers.push(new ObjectId(classId));
  }

  return {
    $or: [
      { classId: { $in: matchers } },
      { "classSnapshot.classId": classId },
    ],
  };
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.res;
  const csrf = verifyAdminCsrf(req);
  if (!csrf.ok) return csrf.res;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { success: false, message: "유효하지 않은 클래스 ID입니다." },
      { status: 400 },
    );
  }

  const classObjectId = new ObjectId(id);
  const existingClass = await guard.db
    .collection(COLLECTION_NAME)
    .findOne({ _id: classObjectId }, { projection: { _id: 1 } });

  if (!existingClass) {
    return NextResponse.json(
      { success: false, message: "클래스를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const applicationCount = await guard.db
    .collection(APPLICATION_COLLECTION_NAME)
    .countDocuments(buildClassApplicationFilter(id));

  if (applicationCount > 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          "이 클래스에 연결된 신청 내역이 있어 삭제할 수 없습니다. 고객 화면에서 숨기려면 숨김 처리를 사용하세요.",
      },
      { status: 409 },
    );
  }

  await guard.db.collection(COLLECTION_NAME).deleteOne({ _id: classObjectId });

  return NextResponse.json({ success: true });
}
