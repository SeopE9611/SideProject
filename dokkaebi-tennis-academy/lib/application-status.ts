// 신청 상태 값 목록
export const APPLICATION_STATUSES = ['접수 완료', '검토 중', '완료'] as const;

// 유니언 타입으로도 생성 가능
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
