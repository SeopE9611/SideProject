describe('결제완료 페이지 접근 가드', () => {
  it('잘못된 orderId 접근 시 리다이렉트/404 가드가 동작한다', () => {
    cy.request({
      url: '/checkout/success?orderId=invalid',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((res) => {
      expect([302, 307, 308, 404]).to.include(res.status);
    });
  });
});
