import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('관리자 게시판 화면 메트릭 표시 스냅샷(views/likes/comments)', () => {
  const source = read('app/admin/boards/BoardsClient.tsx');
  const snapshot = read('tests/snapshots/admin-boards-metrics-render.snapshot.txt').trim();

  const start = source.indexOf('<div className="flex items-center gap-4 text-sm">');
  assert.notEqual(start, -1, '메트릭 블록 시작 지점을 찾지 못했습니다.');

  const end = source.indexOf('</div>', source.indexOf('commentsCount', start));
  assert.notEqual(end, -1, '메트릭 블록 종료 지점을 찾지 못했습니다.');

  const actual = source
    .slice(start, end + '</div>'.length)
    .replace(/\s+/g, ' ')
    .trim();

  assert.equal(actual, snapshot);
  assert.ok(source.includes('const views = Number(item?.views ?? item?.viewCount ?? 0);'));
  assert.ok(source.includes('const likes = Number(item?.likes ?? item?.likeCount ?? 0);'));
});
