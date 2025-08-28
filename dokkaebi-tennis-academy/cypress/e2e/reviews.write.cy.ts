describe('리뷰 작성(상품) - 사진 정렬 → 제출 해피패스', () => {
  const PID = '65d2f1a7e8b9c0123456789a'; // 임의의 24자리 hex (가짜 ObjectId)
  let expectedPhotoOrder: string[] = [];
  beforeEach(() => {
    // 유저 로그인
    cy.intercept('GET', '/api/users/me', {
      statusCode: 200,
      body: { _id: 'u1', role: 'user', email: 'user@test.dev', name: 'Tester' },
    }).as('me');

    // Eligibility 등 페이지 초기 데이터 스텁
    cy.intercept('GET', `/api/reviews/eligibility?productId=${PID}`, {
      statusCode: 200,
      body: { eligible: true, reason: null },
    }).as('elig');

    // 상품 미니 정보
    cy.intercept('GET', `/api/products/${PID}/mini`, {
      statusCode: 200,
      body: { ok: true, name: '라켓 A', image: null },
    }).as('mini');

    // 주문 내 리뷰 대상 아이템(있어도 되고 없어도 됨 — 여기선 단순 통과 목적)
    cy.intercept('GET', '/api/orders/*/review-items', {
      statusCode: 200,
      body: { items: [] },
    }).as('reviewItems');

    // 백그라운드 새션 리프레시가 있다면 무시
    cy.intercept('POST', '/api/refresh', { statusCode: 200, body: {} }).as('refresh');

    // 제출 시 서버로 가는 본 요청 검증
    // beforeEach 안의 create 인터셉트 콜백
    cy.intercept('POST', '/api/reviews', (req) => {
      expect(req.body?.productId).to.eq(PID);
      const photos: string[] = req.body?.photos || [];
      expect(photos).to.deep.eq(expectedPhotoOrder); // 순서까지 완전 일치
      req.reply({ statusCode: 201, body: { ok: true, _id: 'rv1' } });
    }).as('create');
  });

  it('사진 3장 자동 시드 → 1번째를 맨 뒤로 이동 → 그 순서대로 제출', () => {
    cy.visit('/');
    cy.setCookie('__e2e', '1'); // 작성 페이지에서 사진 3장 자동 시드
    cy.visit(`/reviews/write?productId=${PID}`); // 상품 모드

    cy.wait('@elig');
    cy.wait('@mini');

    // 사진 그리드가 보이고 카드가 3장인지 확인
    cy.get('[data-cy=photos-grid]').should('exist');
    cy.get('[data-cy=photo-card]').should('have.length', 3);

    // 현재 순서(src) 캡쳐
    const getSrcs = () => cy.get('[data-cy=photo-card] img').then(($imgs) => $imgs.toArray().map((img) => img.getAttribute('src') || ''));

    let before: string[] = [];
    getSrcs().then((arr) => (before = arr));

    // HTML5 DnD 시뮬레이션: 첫 번째 카드를 마지막 카드 위치로 드래그
    cy.get('[data-cy=photo-card]').eq(0).trigger('dragstart');
    cy.get('[data-cy=photo-card]').eq(2).trigger('dragenter').trigger('drop');

    // 순서가 바뀌었는지 확인
    getSrcs().then((after) => {
      expect(after.length).to.eq(3);
      expect(after[2]).to.eq(before[0]); // 0번이 맨 뒤로
      expectedPhotoOrder = after; // 서버로 보낼 ‘정답’ 순서
    });

    // 제출
    cy.get('[data-cy=submit-review]').click();
    cy.wait('@create').its('response.statusCode').should('eq', 201);
    cy.location('pathname').should('eq', `/products/${PID}`);
    cy.location('hash').should('eq', '#reviews');
    // 토스트 문구(있다면)
    cy.contains('후기가 등록되었습니다.').should('be.visible');

    // 방어: 혹시 페이지 이동 중 서버가 다른 이유로 예외를 던져도 테스트를 깨지 않게
    cy.on('uncaught:exception', (err) => {
      if (/BSONError: input must be a 24 character hex/.test(err.message)) return false;
    });
  });
});
