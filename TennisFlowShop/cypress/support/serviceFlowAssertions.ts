export type CollectionMethod = '택배' | '방문';

export type FlowLabel =
  | 'STRING_ONLY'
  | 'STRING_REPLACE'
  | 'RACKET_PURCHASE_STRING_REPLACE'
  | 'RACKET_RENTAL_STRING_REPLACE';

export type IdConsistencyPayload = {
  orderId?: string;
  stringingApplicationId?: string;
  flowLabel: FlowLabel;
  collectionMethod: CollectionMethod;
};

export type ServiceFlowTrace = {
  scenarioTitle: string;
  successPage: IdConsistencyPayload & {
    paymentOrDepositLabel: string;
    shippingOrVisitGuide: string;
    summaryLabel: string;
    bundleQuantity?: number;
    linkTarget: string;
  };
  myPage: IdConsistencyPayload & {
    tab: '주문' | '신청' | '대여';
    cardLabel: string;
    detailLabel: string;
    linkedTab?: '주문' | '신청' | '대여';
    status?: string;
  };
  admin: IdConsistencyPayload & {
    listLabel: string;
    detailLabel: string;
    linkedSection?: '주문' | '신청' | '대여';
    applicationStatus?: string;
  };
};

export function assertIdConsistency(reference: IdConsistencyPayload, target: IdConsistencyPayload, sourceLabel: string, targetLabel: string) {
  expect(target.flowLabel, `${sourceLabel} ↔ ${targetLabel} flowLabel`).to.equal(reference.flowLabel);
  expect(target.collectionMethod, `${sourceLabel} ↔ ${targetLabel} collectionMethod`).to.equal(reference.collectionMethod);
  expect(target.orderId, `${sourceLabel} ↔ ${targetLabel} orderId`).to.equal(reference.orderId);
  expect(target.stringingApplicationId, `${sourceLabel} ↔ ${targetLabel} stringingApplicationId`).to.equal(reference.stringingApplicationId);
}

export function assertCommonFlowTrace(trace: ServiceFlowTrace) {
  const { successPage, myPage, admin } = trace;

  expect(successPage.summaryLabel).to.not.equal('');
  expect(successPage.paymentOrDepositLabel).to.not.equal('');
  expect(successPage.shippingOrVisitGuide).to.not.equal('');
  expect(successPage.linkTarget).to.match(/^\/mypage\?tab=/);

  expect(myPage.cardLabel).to.not.equal('');
  expect(myPage.detailLabel).to.not.equal('');
  expect(admin.listLabel).to.not.equal('');
  expect(admin.detailLabel).to.not.equal('');

  assertIdConsistency(successPage, myPage, 'successPage', 'myPage');
  assertIdConsistency(successPage, admin, 'successPage', 'admin');
}
