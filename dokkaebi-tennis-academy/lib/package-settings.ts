// 패키지 개별 상품 설정
export interface PackageConfig {
  id: string; // 내부 ID (예: 'package-10')
  name: string; // 화면에 보이는 이름 (예: '10회권')
  sessions: number; // 회수 (10, 30, 50, 100 ...)
  price: number; // 판매 가격
  originalPrice?: number; // 정가 (할인 표시용)
  description: string; // 설명
  features: string[]; // 특징 리스트
  isActive: boolean; // 판매중 여부
  isPopular: boolean; // 추천/대표 패키지 여부
  validityDays: number; // 유효기간(일)
  sortOrder: number; // 정렬 순서
}

// 패키지 공통 설정
export interface GeneralSettings {
  enablePackages: boolean;
  maxValidityDays: number;
  minSessions: number;
  maxSessions: number;
  defaultServiceType: '방문' | '출장';
  autoExpireNotificationDays: number;
  allowExtension: boolean;
  extensionFeePercentage: number;
}

// 기본 패키지 구성 (현재 관리자 페이지 더미 데이터 그대로 이동)
export const DEFAULT_PACKAGE_CONFIGS: PackageConfig[] = [
  {
    id: 'package-10',
    name: '10회권',
    sessions: 10,
    price: 100000,
    originalPrice: 120000,
    description: '스트링 교체 서비스 10회 이용권',
    features: ['10회 스트링 교체', '3개월 유효기간', '방문/출장 서비스'],
    isActive: true,
    isPopular: false,
    validityDays: 90,
    sortOrder: 1,
  },
  {
    id: 'package-30',
    name: '30회권',
    sessions: 30,
    price: 300000,
    originalPrice: 360000,
    description: '스트링 교체 서비스 30회 이용권',
    features: ['30회 스트링 교체', '6개월 유효기간', '방문/출장 서비스', '우선 예약'],
    isActive: true,
    isPopular: true,
    validityDays: 180,
    sortOrder: 2,
  },
  {
    id: 'package-50',
    name: '50회권',
    sessions: 50,
    price: 500000,
    originalPrice: 600000,
    description: '스트링 교체 서비스 50회 이용권',
    features: ['50회 스트링 교체', '9개월 유효기간', '방문/출장 서비스', '우선 예약', '전용 상담'],
    isActive: true,
    isPopular: false,
    validityDays: 270,
    sortOrder: 3,
  },
  {
    id: 'package-100',
    name: '100회권',
    sessions: 100,
    price: 1000000,
    originalPrice: 1200000,
    description: '스트링 교체 서비스 100회 이용권',
    features: ['100회 스트링 교체', '12개월 유효기간', '방문/출장 서비스', '우선 예약', '전용 상담', 'VIP 혜택'],
    isActive: true,
    isPopular: false,
    validityDays: 365,
    sortOrder: 4,
  },
];

// 공통 기본 설정
export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  enablePackages: true,
  maxValidityDays: 365,
  minSessions: 5,
  maxSessions: 200,
  defaultServiceType: '방문',
  autoExpireNotificationDays: 7,
  allowExtension: true,
  extensionFeePercentage: 10,
};
