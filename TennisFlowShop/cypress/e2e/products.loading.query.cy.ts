describe('상품 목록 로딩 UX (쿼리 진입)', () => {
  it('쿼리 파라미터 진입 시 초기 스켈레톤이 노출된 뒤 결과가 렌더된다', () => {
    cy.intercept('GET', '/api/products*', (req) => {
      req.reply({
        delay: 1000,
        statusCode: 200,
        body: {
          products: [
            {
              _id: 'p2',
              name: '쿼리 진입 테스트 스트링',
              brand: 'yonex',
              price: 31000,
              images: [],
              ratingAverage: 4.5,
              ratingCount: 8,
            },
          ],
          pagination: {
            page: 1,
            limit: 6,
            total: 1,
            hasMore: false,
          },
        },
      });
    }).as('products');

    cy.visit('/products?brand=yonex');

    cy.get('[data-cy=products-initial-loading]').should('be.visible');
    cy.wait('@products');
    cy.get('[data-cy=products-initial-loading]').should('not.exist');
    cy.contains('쿼리 진입 테스트 스트링').should('be.visible');
  });
});
