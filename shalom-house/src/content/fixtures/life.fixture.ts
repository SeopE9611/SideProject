export const lifeFixture = {
  contentStatus: "fixture",
  gallery: Array.from({ length: 6 }, (_, index) => ({
    id: `gallery-${index + 1}`,
    title: `활동사진 화면 예시 ${index + 1}`,
    category: "분류 검증용",
    dateLabel: "날짜 확인 필요",
    description: "사진별 공개 승인 자료가 들어갈 정보 배치를 확인합니다.",
    media: {
      kind: "placeholder" as const,
      label: "공식 활동사진 준비 중",
      description: "공개 동의와 게시 승인을 확인한 사진만 표시합니다.",
    },
  })),
} as const;
