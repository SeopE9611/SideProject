describe('라켓 주문 스트링 선택 접근 가드', () => {
  it('잘못된 orderId 접근 시 404 가드가 동작한다', () => {
    cy.request({
      url: '/racket-orders/invalid/select-string',
      followRedirect: false,
      failOnStatusCode: false,
    }).then((res) => {
      expect([302, 307, 308, 404]).to.include(res.status);
    });
  });
});
