describe("헤더 내비게이션", () => {
  const desktopMenus = ["교체서비스", "스트링", "중고 라켓", "커뮤니티", "고객센터"];

  it("마우스 호버 전환이 이전 메뉴의 stale 닫힘으로 닫히지 않고 검색 포커스를 유지한다", () => {
    cy.viewport(1440, 900);
    cy.visit("/");
    cy.get('input[placeholder="스트링 / 라켓 검색"]').first().focus();

    desktopMenus.forEach((name) => {
      cy.contains('nav[aria-label="주요 메뉴"] button', name).trigger("pointerenter", {
        pointerType: "mouse",
      });
      cy.wait(320);
      cy.contains('nav[aria-label="주요 메뉴"] button', name).should(
        "have.attr",
        "aria-expanded",
        "true",
      );
      cy.get('nav[aria-label="주요 메뉴"] button[aria-expanded="true"]').should("have.length", 1);
      cy.focused().should("have.attr", "placeholder", "스트링 / 라켓 검색");
    });

    cy.contains('nav[aria-label="주요 메뉴"] button', "고객센터").trigger("pointerleave", {
      pointerType: "mouse",
    });
    cy.wait(320);
    cy.get('nav[aria-label="주요 메뉴"] button[aria-expanded="true"]').should("not.exist");

    cy.contains('nav[aria-label="주요 메뉴"] button', "스트링").trigger("pointerenter", {
      pointerType: "mouse",
    });
    cy.wait(180);
    cy.contains('nav[aria-label="주요 메뉴"] button', "스트링").trigger("pointerleave", {
      pointerType: "mouse",
    });
    cy.contains("브랜드").trigger("pointerenter", { pointerType: "mouse" });
    cy.wait(320);
    cy.contains('nav[aria-label="주요 메뉴"] button', "스트링").should(
      "have.attr",
      "aria-expanded",
      "true",
    );

    cy.get("body").click(1200, 700);
    cy.get('nav[aria-label="주요 메뉴"] button[aria-expanded="true"]').should("not.exist");
  });

  it("키보드로 열고 패널을 탐색한 뒤 Escape로 트리거에 포커스를 복원한다", () => {
    cy.viewport(1440, 900);
    cy.visit("/");
    cy.contains('nav[aria-label="주요 메뉴"] button', "교체서비스").focus().type("{enter}");
    cy.contains('nav[aria-label="주요 메뉴"] button', "교체서비스").should(
      "have.attr",
      "aria-expanded",
      "true",
    );
    cy.focused().tab();
    cy.focused().should("contain.text", "교체서비스 시작하기");
    cy.focused().type("{esc}");
    cy.contains('nav[aria-label="주요 메뉴"] button', "교체서비스")
      .should("have.attr", "aria-expanded", "false")
      .should("be.focused");
  });

  it("모바일 브랜드 disclosure가 데이터 링크를 표시하고 정확한 URL에서 현재 항목을 연다", () => {
    cy.viewport(390, 844);
    cy.visit("/products?material=hybrid");
    cy.findByRole("button", { name: "메뉴 열기" }).click();
    cy.contains("button", "스트링").should("have.attr", "aria-expanded", "true");
    cy.contains("button", "브랜드").should("have.attr", "aria-expanded", "true");
    cy.contains("button", "하이브리드").should("have.attr", "aria-current", "page");
    cy.contains("button", "럭실론").should("not.have.attr", "aria-current");

    cy.contains("button", "럭실론").click();
    cy.location("pathname").should("eq", "/products");
    cy.location("search").should("eq", "?brand=luxilon");
    cy.findByRole("button", { name: "메뉴 열기" }).click();
    cy.contains("button", "스트링").should("have.attr", "aria-expanded", "true");
    cy.contains("button", "브랜드").should("have.attr", "aria-expanded", "true");
    cy.contains("button", "럭실론").should("have.attr", "aria-current", "page");

    cy.contains("button", "브랜드").click();
    cy.contains("button", "럭실론").should("not.be.visible");
    cy.contains("button", "럭실론").focus().should("not.be.focused");
  });
});
