describe('메시지 작성 인증 가드', () => {
  it('/messages/write 비인증 접근 시 로그인 가드가 동작한다', () => {
    cy.request({ url: '/messages/write', followRedirect: false }).then((res) => {
      expect([302, 307, 308]).to.include(res.status);
      const location = String(res.headers['location'] || '');
      expect(location).to.contain('/login');
    });
  });
});
