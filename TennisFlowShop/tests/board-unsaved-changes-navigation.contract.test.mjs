import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
test("게시판 전용 이탈 coordinator 계약", () => {
  const source = read("lib/hooks/useBoardUnsavedChangesGuard.ts");
  for (const text of ["new Map<symbol, ActiveGuard>()", "Symbol(\"board-unsaved-changes\")", "beforeunload", "document.addEventListener(\"click\", onDocumentClick, true)", "destination.origin !== window.location.origin", "event.ctrlKey", "download", "stopImmediatePropagation", "navigationApprovedForCurrentTurn", "confirmBoardUnsavedChangesNavigation", "runBoardUnsavedChangesNavigation", "navigateAfterSave", "confirm-immediately"]) assert.ok(source.includes(text), text);
});
test("back guard와 게시판 화면 연결", () => {
  const back = read("lib/hooks/useBackNavigationGuard.ts");
  for (const text of ["BackNavigationGuardOptions", "blur-first", "confirm-immediately", "BACK_GUARD_MARKER_KEY", "pushGuardEntry"]) assert.ok(back.includes(text));
  for (const path of ["app/board/notice/_components/NoticeWriteClient.tsx", "app/board/qna/write/page.tsx", "app/board/free/_components/FreeBoardWriteClient.tsx", "app/board/free/[id]/edit/_components/FreeBoardEditClient.tsx", "app/board/market/_components/FreeBoardWriteClient.tsx", "app/board/market/[id]/edit/_components/FreeBoardEditClient.tsx", "app/board/gear/_components/FreeBoardWriteClient.tsx", "app/board/gear/[id]/edit/_components/FreeBoardEditClient.tsx"]) {
    const source = read(path); assert.ok(source.includes("useBoardUnsavedChangesGuard(isDirty)"), path); assert.ok(source.includes("navigateAfterSave"), path);
  }
});
