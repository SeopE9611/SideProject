describe('공개 라우트 스모크', () => {
  const routes = ['/rackets', '/board', '/reviews', '/support', '/privacy', '/terms'];

  routes.forEach((path) => {
    it(`${path} 라우트가 200으로 응답한다`, () => {
      cy.request(path).its('status').should('eq', 200);
      cy.visit(path);
      cy.location('pathname').should('eq', path);
    });
  });
});
