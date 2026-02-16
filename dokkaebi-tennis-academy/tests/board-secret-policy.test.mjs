import test from 'node:test';
import assert from 'node:assert/strict';
import { canViewSecretTitle, maskSecretTitle, resolveBoardViewerContext } from '../lib/board-secret-policy.js';

test('비밀글은 작성자/관리자 외에는 제목을 마스킹한다', () => {
  const secretPost = { title: '원본 제목', isSecret: true, authorId: 'author-1' };

  const maskedForOther = maskSecretTitle(secretPost, { viewerId: 'other-user', isAdmin: false });
  assert.equal(maskedForOther.title, '비밀글입니다');

  const visibleForAuthor = maskSecretTitle(secretPost, { viewerId: 'author-1', isAdmin: false });
  assert.equal(visibleForAuthor.title, '원본 제목');

  const visibleForAdmin = maskSecretTitle(secretPost, { viewerId: 'admin-user', isAdmin: true });
  assert.equal(visibleForAdmin.title, '원본 제목');
});

test('일반글은 누구에게나 원본 제목을 유지한다', () => {
  const normalPost = { title: '일반 제목', isSecret: false, authorId: 'author-1' };
  assert.equal(canViewSecretTitle({ isSecret: false, authorId: 'author-1', viewerId: null, isAdmin: false }), true);
  assert.equal(maskSecretTitle(normalPost, { viewerId: null, isAdmin: false }).title, '일반 제목');
});

test('accessToken 파싱과 사용자 role 조회를 함께 사용해 관리자 여부를 계산한다', async () => {
  const viewer = await resolveBoardViewerContext({
    accessToken: 'valid-token',
    verifyToken: (token) => {
      assert.equal(token, 'valid-token');
      return { sub: 'user-1' };
    },
    fetchUserRoleById: async (userId) => {
      assert.equal(userId, 'user-1');
      return 'admin';
    },
  });

  assert.equal(viewer.viewerId, 'user-1');
  assert.equal(viewer.isAdmin, true);
});

test('토큰이 없거나 파싱 실패하면 비로그인으로 처리한다', async () => {
  const noToken = await resolveBoardViewerContext({
    accessToken: null,
    verifyToken: () => ({ sub: 'x' }),
    fetchUserRoleById: async () => 'admin',
  });

  assert.deepEqual(noToken, { viewerId: null, isAdmin: false, payload: null });

  const invalidToken = await resolveBoardViewerContext({
    accessToken: 'broken',
    verifyToken: () => {
      throw new Error('invalid');
    },
    fetchUserRoleById: async () => 'admin',
  });

  assert.deepEqual(invalidToken, { viewerId: null, isAdmin: false, payload: null });
});
