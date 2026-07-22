import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const between = (source, start, end) => {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `시작 범위를 찾지 못했습니다: ${start}`);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `끝 범위를 찾지 못했습니다: ${end}`);
  return source.slice(from, to);
};
const indexAfter = (source, first, second) =>
  assert.ok(source.indexOf(first) < source.indexOf(second), `${first} → ${second} 순서여야 합니다`);

test("게시판 coordinator는 네이티브와 React 이벤트 취소 경계를 분리한다", () => {
  const source = read("lib/hooks/useBoardUnsavedChangesGuard.ts");
  const nativeCancel = between(source, "const cancelNativeLink", "const cancelReactLink");
  const reactCancel = between(source, "const cancelReactLink", "const onBeforeUnload");
  assert.match(nativeCancel, /event: MouseEvent/);
  assert.match(nativeCancel, /event\.stopImmediatePropagation\(\)/);
  assert.match(reactCancel, /React\.MouseEvent<HTMLAnchorElement>/);
  assert.match(reactCancel, /event\.nativeEvent\.stopImmediatePropagation\(\)/);
  assert.doesNotMatch(source, /React\.MouseEvent<HTMLAnchorElement>\s*\|\s*MouseEvent/);
  assert.doesNotMatch(source, /as any|@ts-ignore|@ts-expect-error/);
  assert.match(between(source, "const onDocumentClick", "const installListeners"), /cancelNativeLink\(event\)/);
  assert.match(between(source, "const guardLinkClick", "const confirmAndNavigate"), /cancelReactLink\(event\)/);
});

test("게시판 coordinator의 기존 보호 정책을 유지한다", () => {
  const source = read("lib/hooks/useBoardUnsavedChangesGuard.ts");
  for (const text of [
    "new Map<symbol, ActiveGuard>()", "Symbol(\"board-unsaved-changes\")", "beforeunload",
    "document.addEventListener(\"click\", onDocumentClick, true)",
    "destination.origin !== window.location.origin", "event.ctrlKey", "anchor.hasAttribute(\"download\")",
    "mailto:|tel:|javascript:", "destination.pathname === window.location.pathname",
    "navigationApprovedForCurrentTurn", "unregister();", "catch (error)", "confirm-immediately",
  ]) assert.ok(source.includes(text), text);
});

test("모바일 Header 이동은 승인 뒤 Sheet를 닫고 로그아웃은 SPA로 이동한다", () => {
  const source = read("components/header.tsx");
  const mobile = between(source, "<SheetContent", "</SheetContent>");
  for (const href of ["/mypage", "/board/event", "/messages", "/cart"]) {
    assert.match(mobile, new RegExp(`guardedPush\\(\\"${href.replace("/", "\\/")}"\\s*,\\s*\\(\\) => setOpen\\(false\\)\\)`));
  }
  const logout = between(source, 'onSelect={async () => {', "로그아웃\n");
  indexAfter(logout, "confirmBoardUnsavedChangesNavigation", "headerPointsCache = null");
  indexAfter(logout, "headerPointsCache = null", 'fetch("/api/logout"');
  indexAfter(logout, 'fetch("/api/logout"', 'router.replace("/")');
  assert.match(logout, /if \(!confirmBoardUnsavedChangesNavigation\(\)\) return/);
  assert.match(logout, /router\.refresh\(\)/);
  assert.doesNotMatch(source, /window\.location\.(href|assign|replace)/);
  assert.doesNotMatch(source, /runBoardUnsavedChangesNavigation\(\(\) => \{\}\)/);
});

test("알림 이동은 승인 전에 읽음 side effect를 실행하지 않는다", () => {
  const source = read("components/notifications/NotificationPanel.tsx");
  const handler = between(source, "const handleItemClick", "const handleMarkAllAsRead");
  assert.match(handler, /if \(href && !confirmBoardUnsavedChangesNavigation\(\)\) return/);
  indexAfter(handler, "confirmBoardUnsavedChangesNavigation", "await markAsRead(id)");
  indexAfter(handler, "await markAsRead(id)", "onClose()");
  indexAfter(handler, "onClose()", "router.push(href)");
  assert.match(handler, /if \(href\) router\.push\(href\)/);
});

test("공지·이벤트 URL 보정은 저장 성공 bypass와 구분한다", () => {
  const source = read("app/board/notice/_components/NoticeWriteClient.tsx");
  const mismatch = between(source, "useEffect(() => {\n    if (!editId || !detail?.item || !isEditRouteMismatch)", "// 프리필:");
  assert.match(mismatch, /confirmAndNavigate\(\(\) =>/);
  assert.match(mismatch, /router\.replace/);
  assert.doesNotMatch(mismatch, /navigateAfterSave/);
  const submit = between(source, "async function handleSubmit", "return (");
  assert.match(submit, /navigateAfterSave\(\(\) =>/);
  assert.match(submit, /router\.push\(listHref\)/);
});

test("8개 게시판 작성·수정 화면은 busy 상태와 무관하게 guard를 유지한다", () => {
  const paths = [
    "app/board/notice/_components/NoticeWriteClient.tsx", "app/board/qna/write/page.tsx",
    "app/board/free/_components/FreeBoardWriteClient.tsx", "app/board/free/[id]/edit/_components/FreeBoardEditClient.tsx",
    "app/board/market/_components/FreeBoardWriteClient.tsx", "app/board/market/[id]/edit/_components/FreeBoardEditClient.tsx",
    "app/board/gear/_components/FreeBoardWriteClient.tsx", "app/board/gear/[id]/edit/_components/FreeBoardEditClient.tsx",
  ];
  for (const path of paths) {
    const source = read(path);
    assert.match(source, /useBoardUnsavedChangesGuard\(isDirty\)/, path);
    assert.doesNotMatch(source, /useBoardUnsavedChangesGuard\([^)]*isSubmitting|useBoardUnsavedChangesGuard\([^)]*isUploading/, path);
    assert.doesNotMatch(source, /useUnsavedChangesGuard\(|useBackNavigationGuard\(/, path);
    assert.match(source, /navigateAfterSave/, path);
    assert.doesNotMatch(source, /window\.confirm\(\s*UNSAVED_CHANGES_MESSAGE/, path);
  }
});

test("브라우저 이벤트를 검증하는 Cypress 명세가 존재한다", () => {
  const path = new URL("../cypress/e2e/board.unsaved-changes-navigation.cy.ts", import.meta.url);
  assert.ok(existsSync(path));
  const source = read("cypress/e2e/board.unsaved-changes-navigation.cy.ts");
  for (const name of ["내부 Link 취소", "내부 Link 승인", "모바일 메뉴 취소", "저장 성공", "저장 실패 후 guard", "첫 뒤로가기"]) {
    assert.ok(source.includes(name), name);
  }
});
