describe('관리자 회원 KPI 노출', () => {
  const adminBypassToken = String(Cypress.env('E2E_ADMIN_BYPASS_TOKEN') || '');

  beforeEach(() => {
    expect(adminBypassToken, 'E2E_ADMIN_BYPASS_TOKEN').to.not.equal('');

    cy.intercept('GET', '/api/users/me', {
      statusCode: 200,
      body: { _id: 'u1', role: 'admin', email: 'admin@test.dev', name: 'Admin' },
    }).as('me');
    cy.intercept('POST', '/api/refresh', { statusCode: 200, body: {} }).as('refresh');
    cy.intercept('POST', '/api/claims/auto-link', { statusCode: 200, body: { success: true } }).as('autoLink');
  });

  const visitUsersPage = () => {
    cy.visit('/admin/users', {
      headers: {
        'x-e2e-admin-bypass-token': adminBypassToken,
      },
    });

    cy.wait('@me');
  };

  it('로딩 중에는 KPI 스켈레톤을 보여주고 완료 후 수치를 텍스트로 보여준다', () => {
    cy.intercept('GET', '/api/admin/users*', (req) => {
      req.reply({
        delay: 800,
        statusCode: 200,
        body: {
          items: [],
          total: 25,
          counters: { total: 25, active: 20, suspended: 3, deleted: 2, admins: 1 },
        },
      });
    }).as('users');

    visitUsersPage();

    cy.contains('전체 회원').parent().find('[role="status"][aria-label="전체 회원 로딩"]').should('be.visible');

    cy.wait('@users');

    cy.contains('전체 회원').parent().contains('25').should('be.visible');
    cy.contains('활성 회원').parent().contains('20').should('be.visible');
    cy.contains('비활성 회원').parent().contains('3').should('be.visible');
    cy.contains('삭제됨(탈퇴)').parent().contains('2').should('be.visible');
    cy.contains('관리자 수').parent().contains('1').should('be.visible');
  });

  it('에러 시 KPI를 모두 - 로 노출한다', () => {
    cy.intercept('GET', '/api/admin/users*', {
      statusCode: 500,
      body: { message: '서버 오류' },
    }).as('usersError');

    visitUsersPage();
    cy.wait('@usersError');

    cy.contains('전체 회원').parent().contains('-').should('be.visible');
    cy.contains('활성 회원').parent().contains('-').should('be.visible');
    cy.contains('비활성 회원').parent().contains('-').should('be.visible');
    cy.contains('삭제됨(탈퇴)').parent().contains('-').should('be.visible');
    cy.contains('관리자 수').parent().contains('-').should('be.visible');
  });

  it('counters가 없으면 rows/total 기반 fallback 값을 보여준다', () => {
    cy.intercept('GET', '/api/admin/users*', {
      statusCode: 200,
      body: {
        total: 3,
        items: [
          { id: 'u1', name: '활성유저', email: 'a@test.dev', role: 'user', isDeleted: false, isSuspended: false },
          { id: 'u2', name: '비활성유저', email: 'b@test.dev', role: 'user', isDeleted: false, isSuspended: true },
          { id: 'u3', name: '관리자', email: 'c@test.dev', role: 'admin', isDeleted: true, isSuspended: false },
        ],
      },
    }).as('usersFallback');

    visitUsersPage();
    cy.wait('@usersFallback');

    cy.contains('전체 회원').parent().contains('3').should('be.visible');
    cy.contains('활성 회원').parent().contains('1').should('be.visible');
    cy.contains('비활성 회원').parent().contains('1').should('be.visible');
    cy.contains('삭제됨(탈퇴)').parent().contains('1').should('be.visible');
    cy.contains('관리자 수').parent().contains('1').should('be.visible');
  });
});
