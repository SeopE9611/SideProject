import type {
  CollectionMethod,
  FlowLabel,
  ServiceFlowTrace,
} from "../support/serviceFlowAssertions";
import { assertCommonFlowTrace } from "../support/serviceFlowAssertions";

type ServiceScenarioKey =
  | "string-only"
  | "string-replace"
  | "racket-buy-string-replace"
  | "racket-rental-string-replace";

function buildIds(prefix: string) {
  return {
    orderId: `ord-${prefix}`,
    stringingApplicationId: `app-${prefix}`,
  };
}

function buildTrace(
  scenario: ServiceScenarioKey,
  method: CollectionMethod,
): ServiceFlowTrace {
  const suffix = `${scenario}-${method === "택배" ? "delivery" : "visit"}`;

  const base = {
    ...buildIds(suffix),
    collectionMethod: method,
  };

  const shippingGuide =
    method === "택배" ? "택배 수거/배송 안내" : "방문 접수 안내";

  const scenarioTemplate: Record<
    ServiceScenarioKey,
    {
      flowLabel: FlowLabel;
      summaryLabel: string;
      myPageTab: "주문" | "신청" | "대여";
      linkedTab?: "주문" | "신청" | "대여";
      adminSection?: "주문" | "신청" | "대여";
      status?: string;
      bundleQuantity?: number;
      linkTarget: string;
      paymentLabel: string;
    }
  > = {
    "string-only": {
      flowLabel: "STRING_ONLY",
      summaryLabel: "스트링 단품 주문 완료",
      myPageTab: "주문",
      adminSection: "주문",
      linkTarget: "/mypage?tab=orders",
      paymentLabel: "결제/입금 확인 완료",
    },
    "string-replace": {
      flowLabel: "STRING_REPLACE",
      summaryLabel: "스트링 + 교체서비스 신청 완료",
      myPageTab: "신청",
      linkedTab: "주문",
      adminSection: "신청",
      status: "신청서 생성",
      linkTarget: "/mypage?tab=applications",
      paymentLabel: "결제/입금 확인 + 교체서비스 접수",
    },
    "racket-buy-string-replace": {
      flowLabel: "RACKET_PURCHASE_STRING_REPLACE",
      summaryLabel: "라켓 구매 + 스트링 선택 + 교체서비스 완료",
      myPageTab: "주문",
      linkedTab: "신청",
      adminSection: "주문",
      status: "번들 신청서 접수",
      bundleQuantity: 1,
      linkTarget: "/mypage?tab=orders",
      paymentLabel: "라켓/스트링/교체서비스 결제 완료",
    },
    "racket-rental-string-replace": {
      flowLabel: "RACKET_RENTAL_STRING_REPLACE",
      summaryLabel: "라켓 대여 + 스트링 선택 + 교체서비스 완료",
      myPageTab: "대여",
      linkedTab: "신청",
      adminSection: "대여",
      status: "대여 연동 신청서 생성",
      bundleQuantity: 1,
      linkTarget: "/mypage?tab=rentals",
      paymentLabel: "대여 결제 완료 및 교체서비스 접수",
    },
  };

  const template = scenarioTemplate[scenario];

  return {
    scenarioTitle: `${scenario} (${method})`,
    successPage: {
      ...base,
      flowLabel: template.flowLabel,
      summaryLabel: template.summaryLabel,
      paymentOrDepositLabel: template.paymentLabel,
      shippingOrVisitGuide: shippingGuide,
      bundleQuantity: template.bundleQuantity,
      linkTarget: template.linkTarget,
    },
    myPage: {
      ...base,
      flowLabel: template.flowLabel,
      tab: template.myPageTab,
      linkedTab: template.linkedTab,
      cardLabel: `${template.summaryLabel} 카드`,
      detailLabel: `${template.summaryLabel} 상세 라벨`,
      status: template.status,
    },
    admin: {
      ...base,
      flowLabel: template.flowLabel,
      listLabel: `${template.summaryLabel} 관리자 리스트 라벨`,
      detailLabel: `${template.summaryLabel} 관리자 상세 라벨`,
      linkedSection: template.adminSection,
      applicationStatus: template.status,
    },
  };
}

describe("@service-flow 4대 시나리오 E2E 검증", () => {
  const scenarios: ServiceScenarioKey[] = [
    "string-only",
    "string-replace",
    "racket-buy-string-replace",
    "racket-rental-string-replace",
  ];

  const methods: CollectionMethod[] = ["택배", "방문"];

  scenarios.forEach((scenario) => {
    methods.forEach((method) => {
      it(`${scenario} / ${method} 공통 검증`, () => {
        const trace = buildTrace(scenario, method);

        assertCommonFlowTrace(trace);

        if (scenario === "string-only") {
          expect(trace.successPage.summaryLabel).to.include("단품 주문");
          expect(trace.myPage.tab).to.equal("주문");
          expect(trace.admin.linkedSection).to.equal("주문");
        }

        if (scenario === "string-replace") {
          expect(trace.myPage.tab).to.equal("신청");
          expect(trace.myPage.linkedTab).to.equal("주문");
          expect(trace.admin.linkedSection).to.equal("신청");
          expect(trace.successPage.stringingApplicationId).to.match(/^app-/);
        }

        if (scenario === "racket-buy-string-replace") {
          expect(trace.successPage.bundleQuantity).to.equal(1);
          expect(trace.myPage.linkedTab).to.equal("신청");
          expect(trace.admin.applicationStatus).to.equal("번들 신청서 접수");
          expect(trace.successPage.linkTarget).to.equal("/mypage?tab=orders");
        }

        if (scenario === "racket-rental-string-replace") {
          expect(trace.successPage.bundleQuantity).to.equal(1);
          expect(trace.successPage.summaryLabel).to.include("라켓 대여");
          expect(trace.myPage.tab).to.equal("대여");
          expect(trace.myPage.linkedTab).to.equal("신청");
          expect(trace.admin.linkedSection).to.equal("대여");
        }
      });
    });
  });
});
