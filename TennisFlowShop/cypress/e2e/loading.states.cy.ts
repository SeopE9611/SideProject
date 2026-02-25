describe('로딩 상태 UX', () => {
  it('상품 목록 초기 조회 지연 시 스켈레톤이 노출되고 응답 후 사라진다', () => {
    cy.intercept('GET', '/api/products*', (req) => {
      req.reply({
        delay: 1200,
        statusCode: 200,
        body: {
          products: [
            {
              _id: 'p1',
              name: '테스트 스트링 1',
              brand: 'luxilon',
              price: 25000,
              images: [],
              ratingAverage: 4.8,
              ratingCount: 12,
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

    cy.visit('/products');

    cy.get('[data-cy=products-initial-loading]').should('be.visible');
    cy.wait('@products');

    cy.get('[data-cy=products-initial-loading]').should('not.exist');
    cy.contains('테스트 스트링 1').should('be.visible');
  });
});
