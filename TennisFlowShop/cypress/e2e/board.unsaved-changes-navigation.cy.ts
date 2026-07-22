describe("게시판 작성·수정 이탈 guard", () => {
  const noticeId = "64f0a1a1a1a1a1a1a1a1a1a1";
  const title = "이탈 guard 검증 제목";
  const editor = '[contenteditable="true"][aria-label="공지사항 본문 편집기"]';

  const stubSession = () => {
    cy.intercept("GET", "/api/users/me", {
      statusCode: 200,
      body: { _id: "admin-1", role: "admin", email: "admin@test.dev", name: "관리자" },
    }).as("me");
    cy.intercept("POST", "/api/refresh", { statusCode: 200, body: {} });
  };

  const openEditor = () => {
    cy.intercept("GET", `/api/boards/${noticeId}`, {
      statusCode: 200,
      body: { ok: true, item: { _id: noticeId, type: "notice", title: "기존 공지 제목", content: "<p>기존 공지 본문은 최소 길이를 만족합니다.</p>", category: "일반", isPinned: false, attachments: [], updatedAt: "2025-02-01T10:00:00.000Z" } },
    }).as("getNotice");
    cy.visit(`/board/notice/write?id=${noticeId}`);
    cy.wait("@getNotice");
    cy.get("#title").should("have.value", "기존 공지 제목");
  };

  const makeDirty = () => cy.get("#title").clear().type(title);

  const stubConfirm = (result?: boolean) => {
    cy.window().then((win) => {
      const confirmStub = cy.stub(win, "confirm");
      if (result !== undefined) confirmStub.returns(result);
      cy.wrap(confirmStub, { log: false }).as("confirm");
    });
  };

  beforeEach(stubSession);

  it("내부 Link 취소: capture와 React onClick이 confirm을 한 번만 호출한다", () => {
    openEditor(); makeDirty();
    stubConfirm(false);
    cy.get('a[href="/"]').first().click();
    cy.get("@confirm").should("have.been.calledOnce");
    cy.location("pathname").should("eq", "/board/notice/write");
    cy.get("#title").should("have.value", title);
  });

  it("내부 Link 승인: confirm 한 번 후 목적지로 이동한다", () => {
    openEditor(); makeDirty();
    stubConfirm(true);
    cy.get('a[href="/"]').first().click();
    cy.get("@confirm").should("have.been.calledOnce");
    cy.location("pathname").should("eq", "/");
  });

  it("모바일 메뉴 취소: Sheet를 닫지 않고 현재 페이지를 유지한다", () => {
    cy.viewport("iphone-6"); openEditor(); makeDirty();
    stubConfirm(false);
    cy.get('button[aria-label="메뉴 열기"]').first().click();
    cy.get('button[aria-label="사용자 메뉴 더보기"]').click();
    cy.contains('[role="menuitem"]', "마이페이지").click();
    cy.get("@confirm").should("have.been.calledOnce");
    cy.location("pathname").should("eq", "/board/notice/write");
    cy.get('[role="dialog"]').should("be.visible");
  });

  it("저장 성공: PATCH 뒤 이동은 confirm 없이 처리한다", () => {
    openEditor(); makeDirty();
    cy.intercept("PATCH", `/api/boards/${noticeId}`, { statusCode: 200, body: { ok: true, item: { _id: noticeId } } }).as("patchNotice");
    stubConfirm();
    cy.get(editor).click().type(" 저장 성공 본문");
    cy.contains("button", "공지사항 수정").click();
    cy.wait("@patchNotice");
    cy.get("@confirm").should("not.have.been.called");
    cy.location("pathname").should("eq", `/board/notice/${noticeId}`);
  });

  it("저장 실패 후 guard: 실패 뒤에도 이탈을 다시 확인한다", () => {
    openEditor(); makeDirty();
    cy.intercept("PATCH", `/api/boards/${noticeId}`, { statusCode: 500, body: { ok: false, error: "저장 실패" } }).as("patchNotice");
    cy.get(editor).click().type(" 저장 실패 본문");
    cy.contains("button", "공지사항 수정").click(); cy.wait("@patchNotice");
    stubConfirm(false);
    cy.get('a[href="/"]').first().click();
    cy.get("@confirm").should("have.been.calledOnce");
    cy.get("#title").should("have.value", title);
  });

  it("첫 뒤로가기: contenteditable 포커스 상태에서도 즉시 한 번 확인한다", () => {
    cy.visit("/"); openEditor(); makeDirty();
    cy.get(editor).click().type(" 뒤로가기 본문");
    stubConfirm(false);
    cy.go("back");
    cy.get("@confirm").should("have.been.calledOnce");
    cy.location("pathname").should("eq", "/board/notice/write");
  });
});
