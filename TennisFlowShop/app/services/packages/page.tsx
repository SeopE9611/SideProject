import StringPackagesPageClient from "@/app/services/packages/_components/StringPackagesPageClient";
import {
  normalizePackageCardData,
  type PackageCardData,
} from "@/app/services/packages/_lib/packageCard";
import {
  type PackageVariant,
  getPackageVariantByIndex,
  toPackageVariant,
} from "@/app/services/packages/_lib/packageVariant";
import { loadPackageSettings } from "@/app/features/packages/api/db";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/lib/auth.utils";
import { findBlockingPackageOrderByUserId } from "@/lib/package-order-ownership";

export const dynamic = "force-dynamic";

// 서버 조회가 실패했을 때 UI 공백을 막기 위한 최소 안전 기본값
const STATIC_PACKAGES: PackageCardData[] = [
  {
    id: "10-sessions",
    title: "스타터 패키지",
    sessions: 10,
    price: 100000,
    originalPrice: 120000,
    discount: 17,
    features: ["10회 스트링 교체", "무료 장력 상담", "기본 스트링 포함"],
    benefits: ["2만원 절약"],
    variant: "primary" as PackageVariant,
    description: "테니스를 시작하는 분들에게 적합한 기본 패키지",
    validityPeriod: "3개월",
    popular: false,
  },
  {
    id: "30-sessions",
    title: "레귤러 패키지",
    sessions: 30,
    price: 300000,
    originalPrice: 360000,
    discount: 17,
    popular: true,
    features: [
      "30회 스트링 교체",
      "무료 장력 상담",
      "프리미엄 스트링 선택",
      "우선 예약",
    ],
    benefits: ["6만원 절약", "우선 예약 혜택"],
    variant: "accent" as PackageVariant,
    description: "정기적으로 테니스를 즐기는 분들을 위한 인기 패키지",
    validityPeriod: "6개월",
  },
  {
    id: "50-sessions",
    title: "프로 패키지",
    sessions: 50,
    price: 500000,
    originalPrice: 600000,
    discount: 17,
    features: [
      "50회 스트링 교체",
      "무료 장력 상담",
      "프리미엄 스트링 선택",
      "우선 예약",
      "무료 그립 교체 5회",
    ],
    benefits: ["10만원 절약", "그립 교체 혜택"],
    variant: "primary" as PackageVariant,
    description: "진지한 테니스 플레이어를 위한 프리미엄 패키지",
    validityPeriod: "9개월",
    popular: false,
  },
  {
    id: "100-sessions",
    title: "챔피언 패키지",
    sessions: 100,
    price: 1000000,
    originalPrice: 1200000,
    discount: 17,
    features: [
      "100회 스트링 교체",
      "무료 장력 상담",
      "프리미엄 스트링 선택",
      "우선 예약",
      "무료 그립 교체 10회",
    ],
    benefits: ["20만원 절약", "전용 서비스"],
    variant: "primary" as PackageVariant,
    description: "프로 선수와 열정적인 플레이어를 위한 최고급 패키지",
    validityPeriod: "12개월",
    popular: false,
  },
].map((pkg) => normalizePackageCardData(pkg));

function safeVerifyAccessToken(token?: string | null) {
  if (!token) return null;
  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

async function getInitialPackages(): Promise<PackageCardData[]> {
  try {
    const { packageConfigs } = await loadPackageSettings();
    const activePackages = packageConfigs
      .filter((pkg) => pkg.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    if (!activePackages.length) return STATIC_PACKAGES;

    return activePackages.map((pkg, index) => {
      const sessions = Number(pkg.sessions || 0);
      const price = Number(pkg.price || 0);
      const originalPrice = Number(
        pkg.originalPrice != null ? pkg.originalPrice : pkg.price || 0,
      );

      const variant = toPackageVariant(
        undefined,
        pkg.isPopular ? "accent" : getPackageVariantByIndex(index),
      );

      return normalizePackageCardData({
        id: pkg.id || `package-${index + 1}`,
        title: pkg.name || `${sessions}회 패키지`,
        sessions,
        price,
        originalPrice,
        popular: !!pkg.isPopular,
        features: Array.isArray(pkg.features) ? pkg.features : [],
        benefits: [],
        variant,
        description: pkg.description || "",
        validityPeriod: pkg.validityDays,
      });
    });
  } catch (error) {
    console.error("[packages/page] 초기 설정 조회 실패", error);
    return STATIC_PACKAGES;
  }
}

async function getInitialOwnershipBlockedMessage(): Promise<string | null> {
  try {
    // ownership은 로그인 사용자 의존값이므로 쿠키를 읽을 수 있는 서버 컴포넌트에서 선조회 가능하다.
    const token = (await cookies()).get("accessToken")?.value ?? null;
    const user = safeVerifyAccessToken(token);
    if (!user?.sub) return null;

    const blocking = await findBlockingPackageOrderByUserId(String(user.sub));
    if (!blocking) return null;

    if (blocking.kind === "pending_order") {
      return "진행 중인 패키지 주문(결제대기)이 있어 추가 구매할 수 없습니다. 기존 주문 상태를 먼저 확인해주세요.";
    }

    return "현재 사용 가능한 패키지가 있어 추가 구매할 수 없습니다. 기존 패키지 이용이 종료된 뒤 다시 구매해주세요.";
  } catch (error) {
    // 초기 UX 보조 데이터 조회 실패는 조용히 무시한다. 최종 차단은 주문 API에서 다시 검증된다.
    console.error("[packages/page] 초기 ownership 조회 실패", error);
    return null;
  }
}

export default async function StringPackagesPage() {
  // 기존 구조는 클라이언트 마운트 이후 settings/ownership를 각각 추가 fetch했다.
  // 아래처럼 서버에서 동시에 선조회하면 첫 화면에서 바로 데이터를 사용할 수 있어 체감 지연을 줄일 수 있다.
  const [initialPackages, initialOwnershipBlockedMessage] = await Promise.all([
    getInitialPackages(),
    getInitialOwnershipBlockedMessage(),
  ]);

  return (
    <StringPackagesPageClient
      initialPackages={initialPackages}
      initialOwnershipBlockedMessage={initialOwnershipBlockedMessage}
    />
  );
}
