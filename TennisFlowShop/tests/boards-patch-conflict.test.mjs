import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyBoardPatchFailure } from '../lib/boards-patch-conflict.js';

test('clientSeenDate가 있고 문서가 남아 있으면 conflict를 반환한다', () => {
  const result = classifyBoardPatchFailure({
    hasClientSeenDate: true,
    postStillExists: true,
  });

  assert.equal(result, 'conflict');
});

test('clientSeenDate가 있어도 문서가 없으면 not_found를 반환한다', () => {
  const result = classifyBoardPatchFailure({
    hasClientSeenDate: true,
    postStillExists: false,
  });

  assert.equal(result, 'not_found');
});

test('clientSeenDate가 없으면 기존처럼 not_found를 반환한다', () => {
  const result = classifyBoardPatchFailure({
    hasClientSeenDate: false,
    postStillExists: true,
  });

  assert.equal(result, 'not_found');
});
