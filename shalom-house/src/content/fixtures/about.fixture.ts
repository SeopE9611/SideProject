export type StaffProfile = {
  id: string;
  contentStatus: "fixture" | "official";
  name?: string;
  role: string;
  responsibility: string;
  media?:
    | {
        kind: "image";
        src: string;
        alt: string;
        width: number;
        height: number;
      }
    | {
        kind: "placeholder";
        label: string;
        description: string;
      };
};

export const aboutFixture = {
  contentStatus: "fixture",
  greeting: {
    statusLabel: "공식 인사말 준비 중",
    title: "확인된 인사말을 준비하고 있습니다",
    paragraphs: ["운영 책임자의 확인을 마친 내용이 등록되면 이 페이지에서 안내합니다."],
  },
  staffProfiles: [
    {
      id: "role-operation",
      contentStatus: "fixture",
      role: "운영 책임 역할 화면 예시",
      responsibility: "운영 방향과 공개 정보의 최종 확인 과정을 설명하는 긴 담당 영역의 배치를 검증합니다.",
      media: {
        kind: "placeholder",
        label: "직원 미디어 준비 중",
        description: "승인된 자료가 있을 때만 표시합니다.",
      },
    },
    {
      id: "role-living",
      contentStatus: "fixture",
      role: "생활 지원 역할 화면 예시",
      responsibility: "일상생활 지원과 관련된 역할 및 긴 담당 설명이 작은 화면에서도 안전하게 표시되는지 확인합니다.",
      media: {
        kind: "placeholder",
        label: "직원 미디어 준비 중",
        description: "승인된 자료가 있을 때만 표시합니다.",
      },
    },
    {
      id: "role-administration",
      contentStatus: "fixture",
      role: "행정 지원 역할 화면 예시",
      responsibility: "행정 문의 연결과 자료 확인 책임을 설명하는 레이아웃 검증용 담당 영역입니다.",
      media: {
        kind: "placeholder",
        label: "직원 미디어 준비 중",
        description: "승인된 자료가 있을 때만 표시합니다.",
      },
    },
  ] as readonly StaffProfile[],
  spaces: [
    {
      id: "space-common",
      title: "공용 생활공간 화면 예시",
      description: "공식 공간 설명과 사진이 들어갈 목록 구조를 확인합니다.",
      mediaStatus: "placeholder",
    },
    {
      id: "space-daily",
      title: "일상 공간 화면 예시",
      description: "실제 구조나 설비를 단정하지 않는 배치 검증 항목입니다.",
      mediaStatus: "placeholder",
    },
    {
      id: "space-outdoor",
      title: "외부 공간 화면 예시",
      description: "승인된 공간 자료가 준비되기 전의 중립적인 상태입니다.",
      mediaStatus: "placeholder",
    },
  ],
} as const;
