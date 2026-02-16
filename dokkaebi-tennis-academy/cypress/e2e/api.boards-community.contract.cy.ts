describe('Boards/Community 리스트 쿼리 계약', () => {
  const kind = 'free';

  const queryCases: Array<{ name: string; params: Record<string, string> }> = [
    {
      name: '기본 latest 조회',
      params: { page: '1', limit: '10' },
    },
    {
      name: '조회수 정렬 + 제목 검색',
      params: { page: '1', limit: '10', sort: 'views', q: '테스트', searchType: 'title' },
    },
    {
      name: '추천 정렬 + 작성자 검색 + 작성자 필터(유효하지 않은 ID는 무시)',
      params: {
        page: '1',
        limit: '10',
        sort: 'likes',
        q: '회원',
        searchType: 'author',
        authorId: 'not-object-id',
      },
    },
    {
      name: '브랜드/카테고리 필터 + title_content 검색',
      params: {
        page: '1',
        limit: '10',
        sort: 'latest',
        q: '라켓',
        searchType: 'title_content',
        category: 'racket',
        brand: 'Babolat',
      },
    },
  ];

  queryCases.forEach(({ name, params }) => {
    it(`${name}: /api/boards 와 /api/community/posts 응답 계약이 일치한다`, () => {
      const boardParams = new URLSearchParams({ kind, type: kind, ...params });
      const communityParams = new URLSearchParams({ type: kind, ...params });

      cy.request({
        method: 'GET',
        url: `/api/boards?${boardParams.toString()}`,
        failOnStatusCode: false,
      }).then((boardsRes) => {
        expect(boardsRes.status).to.eq(200);
        expect(boardsRes.body).to.have.property('ok', true);
        expect(boardsRes.body).to.have.property('items').that.is.an('array');
        expect(boardsRes.body).to.have.property('total').that.is.a('number');
        expect(boardsRes.body).to.have.property('page').that.is.a('number');
        expect(boardsRes.body).to.have.property('limit').that.is.a('number');

        cy.request({
          method: 'GET',
          url: `/api/community/posts?${communityParams.toString()}`,
          failOnStatusCode: false,
        }).then((communityRes) => {
          expect(communityRes.status).to.eq(200);
          expect(communityRes.body).to.have.property('ok', true);

          const boardIds = (boardsRes.body.items as Array<{ id: string }>).map((item) => item.id);
          const communityIds = (communityRes.body.items as Array<{ id: string }>).map((item) => item.id);

          expect(boardIds).to.deep.equal(communityIds);
          expect(boardsRes.body.total).to.eq(communityRes.body.total);
          expect(boardsRes.body.page).to.eq(communityRes.body.page);
          expect(boardsRes.body.limit).to.eq(communityRes.body.limit);
        });
      });
    });
  });
});
