export const lifeFixture = {
  contentStatus: "fixture",
  programs: [
    {
      id: "program-daily",
      category: "일상 영역 예시",
      title: "일상 활동 화면 예시",
      purpose: "정보 구조 검증",
      description: "승인된 프로그램 설명이 들어갈 행 배치를 확인합니다.",
      operatingStatus: "운영 여부 검증용",
    },
    {
      id: "program-community",
      category: "지역 영역 예시",
      title: "지역 활동 화면 예시",
      purpose: "긴 문구 배치 검증",
      description: "실제 일정이나 운영 사실을 나타내지 않는 화면 예시입니다.",
      operatingStatus: "운영 여부 검증용",
    },
    {
      id: "program-leisure",
      category: "여가 영역 예시",
      title: "여가 활동 화면 예시",
      purpose: "분류 표시 검증",
      description: "공식 목록 확인 후 교체할 레이아웃 검증 항목입니다.",
      operatingStatus: "운영 여부 검증용",
    },
    {
      id: "program-learning",
      category: "배움 영역 예시",
      title: "배움 활동 화면 예시",
      purpose: "목록 밀도 검증",
      description: "제목, 목적과 설명의 읽기 순서를 확인합니다.",
      operatingStatus: "운영 여부 검증용",
    },
  ],
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
