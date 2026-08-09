import assert from "node:assert/strict";
import test from "node:test";

import {
  TARGET_PARTIAL_FILTER,
  classifyEmailIndexes,
} from "../scripts/db/audit-users-email-index-for-apps-in-toss.mjs";

const legacy = (name, overrides = {}) => ({
  name,
  key: { email: 1 },
  unique: true,
  ...overrides,
});

test("허용된 두 이름의 non-partial unique email index만 legacy로 판정한다", () => {
  assert.equal(classifyEmailIndexes([legacy("email_1")]).indexState, "legacy");
  assert.equal(classifyEmailIndexes([legacy("users_email_unique")]).indexState, "legacy");
  assert.equal(classifyEmailIndexes([legacy("unknown_email_index")]).indexState, "unexpected");
  assert.equal(classifyEmailIndexes([legacy("email_1", { sparse: true })]).indexState, "unexpected");
});

test("정확한 이름과 partial filter를 가진 index만 target으로 판정한다", () => {
  assert.equal(
    classifyEmailIndexes([
      legacy("users_email_unique", { partialFilterExpression: TARGET_PARTIAL_FILTER }),
    ]).indexState,
    "target",
  );
  assert.equal(
    classifyEmailIndexes([
      legacy("email_1", { partialFilterExpression: TARGET_PARTIAL_FILTER }),
    ]).indexState,
    "unexpected",
  );
});

test("email 관련 index가 두 개이면 unexpected로 판정한다", () => {
  assert.equal(
    classifyEmailIndexes([legacy("email_1"), legacy("users_email_unique")]).indexState,
    "unexpected",
  );
});
