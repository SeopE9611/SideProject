import clientPromise from '@/lib/mongodb'; // MongoDB 연결을 위한 client
import { subYears } from 'date-fns'; // 1년 전 날짜 계산용 유틸

// 1년 이상 경과한 익명 계정 완전 삭제 함수
export async function deleteOldAnonymizedUsers() {
  const client = await clientPromise; // MongoDB 클라이언트 연결
  const db = client.db();
  const users = db.collection('users');

  // 현재 날짜 기준 1년 전을 삭제 기준일로 계산
  const cutoffDate = subYears(new Date(), 1);

  // 영구 삭제 처리된 계정 중 1년이 지난 사용자 완전 삭제
  const result = await users.deleteMany({
    permanentlyDeleted: true, // 익명화 플래그가 true인 계정만 대상
    permanentlyDeletedAt: { $lt: cutoffDate }, // 1년 이상 지난 계정
  });

  return result.deletedCount; // 삭제된 문서 수 반환
}
