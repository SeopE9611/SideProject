describe('메시지 API 계약 스모크', () => {
  it('비인증 상태에서 /api/messages/send POST는 401을 반환한다', () => {
    cy.request({
      method: 'POST',
      url: '/api/messages/send',
      failOnStatusCode: false,
      body: { toUserId: '507f1f77bcf86cd799439011', title: '테스트', body: '테스트 본문' },
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body).to.have.property('ok', false);
    });
  });
});
