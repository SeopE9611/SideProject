import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const routePath = path.resolve(process.cwd(), 'app/api/community/posts/[id]/route.ts');
const routeSource = fs.readFileSync(routePath, 'utf8');

test('community PATCH는 If-Unmodified-Since / clientSeenDate 조건을 해석한다', () => {
  assert.match(routeSource, /req\.headers\.get\('if-unmodified-since'\)/);
  assert.match(routeSource, /clientSeenDateBody/);
  assert.match(routeSource, /ifUnmodifiedSinceBody/);
});

test('community PATCH 매칭 실패 시 conflict\(409\)와 not_found\(404\)를 분기한다', () => {
  assert.match(routeSource, /if \(failure === 'conflict'\)/);
  assert.match(routeSource, /error:\s*'conflict'/);
  assert.match(routeSource, /status:\s*409/);
  assert.match(routeSource, /error:\s*'not_found'/);
  assert.match(routeSource, /status:\s*404/);
});
