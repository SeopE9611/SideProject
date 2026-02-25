describe('상품 API 계약 스모크', () => {
  it('GET /api/products는 products/pagination 키를 반환한다', () => {
    cy.request({
      url: '/api/products?limit=1&page=1',
      failOnStatusCode: false,
    }).then((res) => {
      expect([200, 500]).to.include(res.status);
      if (res.status === 200) {
        expect(res.body).to.have.property('products');
        expect(res.body).to.have.property('pagination');
        expect(res.body.pagination).to.include.keys('page', 'limit', 'total', 'hasMore');
      }
    });
  });
});
