describe('로그인 라우트 스모크', () => {
  it('/login이 정상 응답한다', () => {
    cy.request({ url: '/login', followRedirect: false }).then((res) => {
      expect(res.status).to.eq(200);
    });

    cy.visit('/login');
    cy.location('pathname').should('eq', '/login');
  });
});
