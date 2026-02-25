describe('로그인 상호작용 회귀', () => {
  it('로그인 제출 시 로딩 상태가 노출되고 요청이 수행된다', () => {
    cy.intercept('POST', '/api/login', (req) => {
      req.reply({
        delay: 700,
        statusCode: 401,
        body: { error: '테스트용 로그인 실패' },
      });
    }).as('loginSubmit');

    cy.visit('/login');
    cy.get('[data-cy=login-email]').type('e2e@example.com');
    cy.get('[data-cy=login-password]').type('wrong-password');
    cy.get('[data-cy=login-submit]').click();

    cy.get('[data-cy=login-submit]').should('contain.text', '로그인 중...');
    cy.wait('@loginSubmit');
    cy.get('[data-cy=login-submit]').should('contain.text', '로그인');
  });
});
