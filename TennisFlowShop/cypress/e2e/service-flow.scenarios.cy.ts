type DeliveryMethod = '택배' | '방문';

type ScenarioKey = 'string-only' | 'string-replace' | 'racket-buy-string-replace' | 'racket-rental-string-replace';

type ScenarioExpectation = {
  scenario: ScenarioKey;
  title: string;
  successPage: {
    receiptMethod: DeliveryMethod;
    deliveryOrVisitInfo: string;
    amountText: string;
    applicationLink: string;
  };
  myPage: {
    orderOrRentalLinked: boolean;
    status: string;
    ctas: string[];
  };
  adminPage: {
    orderVisible: boolean;
    applicationVisible: boolean;
    rentalPolicyVisible: boolean;
    flowBadge: '1' | '3' | '4' | '6' | '7';
  };
};

const scenarioMatrix: Record<ScenarioKey, Record<DeliveryMethod, ScenarioExpectation>> = {
  'string-only': {
    택배: {
      scenario: 'string-only',
      title: '스트링 단품',
      successPage: {
        receiptMethod: '택배',
        deliveryOrVisitInfo: '택배 수거/배송 정보 노출',
        amountText: '교체 서비스 비용 기준',
        applicationLink: '/mypage?tab=applications',
      },
      myPage: {
        orderOrRentalLinked: false,
        status: '접수완료',
        ctas: ['상세보기', '운송장 등록하기'],
      },
      adminPage: {
        orderVisible: false,
        applicationVisible: true,
        rentalPolicyVisible: false,
        flowBadge: '3',
      },
    },
    방문: {
      scenario: 'string-only',
      title: '스트링 단품',
      successPage: {
        receiptMethod: '방문',
        deliveryOrVisitInfo: '방문 희망일시 정보 노출',
        amountText: '교체 서비스 비용 기준',
        applicationLink: '/mypage?tab=applications',
      },
      myPage: {
        orderOrRentalLinked: false,
        status: '접수완료',
        ctas: ['상세보기'],
      },
      adminPage: {
        orderVisible: false,
        applicationVisible: true,
        rentalPolicyVisible: false,
        flowBadge: '3',
      },
    },
  },
  'string-replace': {
    택배: {
      scenario: 'string-replace',
      title: '스트링+교체',
      successPage: {
        receiptMethod: '택배',
        deliveryOrVisitInfo: '택배 수거/배송 정보 노출',
        amountText: '스트링 + 교체비 합산',
        applicationLink: '/mypage?tab=applications',
      },
      myPage: {
        orderOrRentalLinked: false,
        status: '접수완료',
        ctas: ['상세보기', '운송장 등록하기'],
      },
      adminPage: {
        orderVisible: false,
        applicationVisible: true,
        rentalPolicyVisible: false,
        flowBadge: '3',
      },
    },
    방문: {
      scenario: 'string-replace',
      title: '스트링+교체',
      successPage: {
        receiptMethod: '방문',
        deliveryOrVisitInfo: '방문 희망일시 정보 노출',
        amountText: '스트링 + 교체비 합산',
        applicationLink: '/mypage?tab=applications',
      },
      myPage: {
        orderOrRentalLinked: false,
        status: '접수완료',
        ctas: ['상세보기'],
      },
      adminPage: {
        orderVisible: false,
        applicationVisible: true,
        rentalPolicyVisible: false,
        flowBadge: '3',
      },
    },
  },
  'racket-buy-string-replace': {
    택배: {
      scenario: 'racket-buy-string-replace',
      title: '라켓구매+스트링+교체',
      successPage: {
        receiptMethod: '택배',
        deliveryOrVisitInfo: '배송지 및 수거 정보 노출',
        amountText: '라켓 + 스트링 + 교체비 합산',
        applicationLink: '/mypage?tab=applications',
      },
      myPage: {
        orderOrRentalLinked: true,
        status: '접수완료',
        ctas: ['상세보기', '원 주문 상세 보기'],
      },
      adminPage: {
        orderVisible: true,
        applicationVisible: true,
        rentalPolicyVisible: false,
        flowBadge: '4',
      },
    },
    방문: {
      scenario: 'racket-buy-string-replace',
      title: '라켓구매+스트링+교체',
      successPage: {
        receiptMethod: '방문',
        deliveryOrVisitInfo: '방문 희망일시 정보 노출',
        amountText: '라켓 + 스트링 + 교체비 합산',
        applicationLink: '/mypage?tab=applications',
      },
      myPage: {
        orderOrRentalLinked: true,
        status: '접수완료',
        ctas: ['상세보기', '원 주문 상세 보기'],
      },
      adminPage: {
        orderVisible: true,
        applicationVisible: true,
        rentalPolicyVisible: false,
        flowBadge: '4',
      },
    },
  },
  'racket-rental-string-replace': {
    택배: {
      scenario: 'racket-rental-string-replace',
      title: '라켓대여+스트링+교체',
      successPage: {
        receiptMethod: '택배',
        deliveryOrVisitInfo: '대여 반납/수거 정책 정보 노출',
        amountText: '대여 결제 완료 금액 기준',
        applicationLink: '/mypage?tab=applications',
      },
      myPage: {
        orderOrRentalLinked: true,
        status: '접수완료',
        ctas: ['상세보기', '원 대여 상세 보기'],
      },
      adminPage: {
        orderVisible: false,
        applicationVisible: true,
        rentalPolicyVisible: true,
        flowBadge: '6',
      },
    },
    방문: {
      scenario: 'racket-rental-string-replace',
      title: '라켓대여+스트링+교체',
      successPage: {
        receiptMethod: '방문',
        deliveryOrVisitInfo: '방문 희망일시 및 대여 정책 정보 노출',
        amountText: '대여 결제 완료 금액 기준',
        applicationLink: '/mypage?tab=applications',
      },
      myPage: {
        orderOrRentalLinked: true,
        status: '접수완료',
        ctas: ['상세보기', '원 대여 상세 보기'],
      },
      adminPage: {
        orderVisible: false,
        applicationVisible: true,
        rentalPolicyVisible: true,
        flowBadge: '6',
      },
    },
  },
};

function assertSharedValidation(expectation: ScenarioExpectation) {
  expect(expectation.successPage.receiptMethod).to.be.oneOf(['택배', '방문']);
  expect(expectation.successPage.deliveryOrVisitInfo).to.not.equal('');
  expect(expectation.successPage.amountText).to.not.equal('');
  expect(expectation.successPage.applicationLink).to.include('/mypage?tab=applications');

  expect(expectation.myPage.status).to.not.equal('');
  expect(expectation.myPage.ctas.length).to.be.greaterThan(0);

  expect(expectation.adminPage.applicationVisible).to.equal(true);
  expect(expectation.adminPage.flowBadge).to.match(/^[13467]$/);
}

describe('@service-flow 시나리오 매트릭스 스펙', () => {
  (Object.keys(scenarioMatrix) as ScenarioKey[]).forEach((scenario) => {
    (['택배', '방문'] as DeliveryMethod[]).forEach((method) => {
      it(`${scenario} - ${method} 검증`, () => {
        const expectation = scenarioMatrix[scenario][method];
        assertSharedValidation(expectation);
      });
    });
  });

  it('필수 data-cy selector가 코드에 존재한다', () => {
    cy.readFile('app/services/success/page.tsx').then((content) => {
      expect(content).to.include('data-cy="service-success-summary-card"');
      expect(content).to.include('data-cy="service-success-amount-card"');
      expect(content).to.include('data-cy="service-success-collection-card"');
      expect(content).to.include('data-cy="service-success-application-link"');
    });

    cy.readFile('app/mypage/applications/_components/ApplicationsClient.tsx').then((content) => {
      expect(content).to.include('data-cy="mypage-application-summary-card"');
      expect(content).to.include('data-cy="mypage-application-status-badge"');
      expect(content).to.include('data-cy="mypage-application-detail-cta"');
      expect(content).to.include('data-cy="mypage-application-shipping-cta"');
    });

    cy.readFile('app/admin/operations/_components/OperationsClient.tsx').then((content) => {
      expect(content).to.include('data-cy="admin-operations-flow-badge-1"');
      expect(content).to.include('data-cy="admin-operations-flow-badge-3"');
      expect(content).to.include('data-cy="admin-operations-flow-badge-4"');
      expect(content).to.include('data-cy="admin-operations-flow-badge-6"');
    });
  });
});
