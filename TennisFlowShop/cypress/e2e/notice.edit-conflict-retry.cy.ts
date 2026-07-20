describe("공지사항 수정 동시 수정 충돌(409) 재시도 UX", () => {
  const noticeId = "64f0a1a1a1a1a1a1a1a1a1a1";

  it("409 conflict 수신 시 경고 + 다시 불러오기 버튼으로 재시도 UX를 제공한다", () => {
    // -----------------------------------------------------------------------
    // 1) 수정 화면 진입 전 상세 조회 응답을 고정한다.
    //    - 초기 렌더에서 제목/본문이 자동 프리필 되어야 submit 흐름이 안정적으로 재현된다.
    // -----------------------------------------------------------------------
    cy.intercept("GET", `/api/boards/${noticeId}`, {
      statusCode: 200,
      body: {
        ok: true,
        item: {
          _id: noticeId,
          type: "notice",
          title: "기존 공지 제목",
          content: "기존 공지 본문입니다. 최소 길이를 만족합니다.",
          category: "일반",
          isPinned: false,
          attachments: [],
          updatedAt: "2025-02-01T10:00:00.000Z",
        },
      },
    }).as("getNoticeDetail");

    // -----------------------------------------------------------------------
    // 2) 저장(PATCH)은 동시 수정 충돌을 강제로 발생시켜 409 UX를 검증한다.
    // -----------------------------------------------------------------------
    cy.intercept("PATCH", `/api/boards/${noticeId}`, {
      statusCode: 409,
      body: { ok: false, error: "conflict" },
    }).as("patchConflict");

    cy.visit(`/board/notice/write?id=${noticeId}`);
    cy.wait("@getNoticeDetail");

    cy.get("#title").clear().type("동시 수정 충돌 테스트 제목");
    cy.get("#content")
      .clear()
      .type("동시 수정 충돌 테스트 본문입니다. 재시도 UX를 확인하기 위한 충분한 길이입니다.");

    cy.contains("button", "공지사항 수정").click();
    cy.wait("@patchConflict");

    cy.contains(
      "게시물이 수정 화면을 연 이후 변경되었거나 이전 저장 요청이 이미 반영되었을 수 있습니다. 최신 내용을 다시 불러온 뒤 확인해 주세요.",
    ).should("be.visible");
    cy.contains("button", "다시 불러오기").should("be.visible");

    // -----------------------------------------------------------------------
    // 3) 사용자가 "다시 불러오기"를 누르면 상세 재조회가 실행되어야 한다.
    //    - 재조회 호출 자체를 재시도 UX의 핵심 완료 조건으로 본다.
    // -----------------------------------------------------------------------
    cy.intercept("GET", `/api/boards/${noticeId}`, {
      statusCode: 200,
      body: {
        ok: true,
        item: {
          _id: noticeId,
          type: "notice",
          title: "최신 공지 제목",
          content: "최신 공지 본문입니다. 재조회 반영 확인용 데이터입니다.",
          category: "일반",
          isPinned: true,
          attachments: [],
          updatedAt: "2025-02-01T10:05:00.000Z",
        },
      },
    }).as("refetchNoticeDetail");

    cy.contains("button", "다시 불러오기").click();
    cy.wait("@refetchNoticeDetail");
  });
});
