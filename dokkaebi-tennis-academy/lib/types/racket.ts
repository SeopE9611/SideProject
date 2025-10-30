// 중고 라켓 도메인 타입 (판매 + 대여 겸용)
// - 판매가(price): 중고 판매용 표시가격
// - rental: 대여 가능 여부와 요금표(7/15/30일), 보증금
export type RacketCondition = 'A' | 'B' | 'C';

export type UsedRacket = {
  id: string; // 문자열 ID (ObjectId toString())
  brand: string; // 예: "Yonex", "Babolat"
  model: string; // 예: "EZONE 98"
  year?: number;
  spec: {
    weight: number; // g
    balance: number; // mm
    headSize: number; // sq.in
    pattern: string; // 예: "16x19"
    gripSize: string; // 예: "G2"
  };
  condition: RacketCondition; // 상태등급
  price: number; // 중고 판매가
  images: string[]; // Supabase 등 업로드 URL
  status: 'available' | 'sold' | 'rented' | 'inactive';

  rental?: {
    enabled: boolean; // 대여 가능 여부
    deposit: number; // 보증금
    fee: { d7: number; d15: number; d30: number }; // 기간별 수수료
  };

  createdAt?: string;
  updatedAt?: string;
};
