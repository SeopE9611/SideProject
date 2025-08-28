describe('관리자 리뷰 - 다중 상태 일괄 변경', () => {
  beforeEach(() => {
    // 세션/백그라운드
    cy.intercept('GET', '/api/users/me', {
      statusCode: 200,
      body: { _id: 'u1', role: 'admin', email: 'admin@test.dev', name: 'Admin' },
    }).as('me');
    cy.intercept('POST', '/api/refresh', { statusCode: 200, body: {} }).as('refresh');
    cy.intercept('POST', '/api/claims/auto-link', { statusCode: 200, body: { success: true } }).as('autoLink');

    // 관리자 목록/메트릭스
    cy.intercept('GET', '/api/admin/reviews/metrics*', {
      statusCode: 200,
      body: { total: 3, visible: 2, hidden: 1, today: 0 },
    }).as('metrics');
    cy.intercept('GET', '/api/admin/reviews*', { fixture: 'reviews.list.json' }).as('list');

    // PATCH는 /api/reviews/:id 또는 /api/admin/reviews/:id 두 경우를 모두
    cy.intercept('PATCH', /\/api\/(?:admin\/)?reviews\/[^/]+$/, (req) => {
      const b = req.body || {};
      expect(['visible', 'hidden']).to.include(b.status);
      req.reply({ statusCode: 200, body: { success: true } });
    }).as('patch');
  });

  const selectRows = (indexes: number[]) => {
    // shadcn 버튼형 체크박스: click → data-state가 checked로 바뀌는지 확인
    indexes.forEach((i) => {
      cy.get('[data-cy=row-checkbox]').eq(i).scrollIntoView().click({ force: true }).invoke('attr', 'data-state').should('eq', 'checked');
    });
  };

  it('두 행 선택 → 선택 비공개 클릭 → PATCH 2회 호출', () => {
    cy.visit('/');
    cy.setCookie('__e2e', '1'); // SSR 가드 우회
    cy.visit('/admin/reviews');

    cy.wait('@me');
    cy.wait('@metrics');
    cy.wait('@list');

    cy.get('[data-cy=row-checkbox]').its('length').should('be.gte', 2);

    selectRows([0, 1]);

    cy.get('[data-cy=bulk-hidden]').click();

    cy.wait('@patch');
    cy.wait('@patch');
  });

  it('두 행 선택 → 선택 공개 클릭 → PATCH 2회 호출', () => {
    cy.visit('/');
    cy.setCookie('__e2e', '1');
    cy.visit('/admin/reviews');

    cy.wait('@me');
    cy.wait('@metrics');
    cy.wait('@list');

    cy.get('[data-cy=row-checkbox]').its('length').should('be.gte', 3);

    selectRows([0, 2]);

    cy.get('[data-cy=bulk-visible]').click();

    cy.wait('@patch');
    cy.wait('@patch');
  });
});
