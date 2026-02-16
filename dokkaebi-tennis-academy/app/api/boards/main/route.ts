import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDb } from '@/lib/mongodb';
import { API_VERSION } from '@/lib/board.repository';
import { verifyAccessToken } from '@/lib/auth.utils';
import { ObjectId } from 'mongodb';
import { maskSecretTitle, resolveBoardViewerContext } from '@/lib/board-secret-policy';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await getDb();
  const accessToken = (await cookies()).get('accessToken')?.value;
  const viewer = await resolveBoardViewerContext({
    accessToken,
    verifyToken: verifyAccessToken,
    fetchUserRoleById: async (userId) => {
      if (!ObjectId.isValid(userId)) return null;
      const user = await db.collection('users').findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });
      return typeof user?.role === 'string' ? user.role : null;
    },
  });
  const col = db.collection('board_posts');

  // 공지 5개 (고정 우선)
  const notices = await col
    .aggregate([
      { $match: { type: 'notice', status: 'published' } },
      { $sort: { isPinned: -1, createdAt: -1 } },
      { $limit: 5 },

      // attachments 보정
      { $addFields: { attachmentsArr: { $ifNull: ['$attachments', []] } } },

      // 이미지/파일 카운트 & 플래그
      {
        $addFields: {
          imagesCount: {
            $size: {
              $filter: {
                input: '$attachmentsArr',
                as: 'a',
                cond: {
                  $or: [{ $regexMatch: { input: { $ifNull: ['$$a.mime', ''] }, regex: /^image\// } }, { $regexMatch: { input: { $ifNull: ['$$a.url', ''] }, regex: /\.(png|jpe?g|gif|webp|bmp|svg)$/i } }],
                },
              },
            },
          },
          filesCount: {
            $size: {
              $filter: {
                input: '$attachmentsArr',
                as: 'a',
                cond: {
                  $and: [{ $not: [{ $regexMatch: { input: { $ifNull: ['$$a.mime', ''] }, regex: /^image\// } }] }, { $not: [{ $regexMatch: { input: { $ifNull: ['$$a.url', ''] }, regex: /\.(png|jpe?g|gif|webp|bmp|svg)$/i } }] }],
                },
              },
            },
          },
        },
      },
      { $addFields: { hasImage: { $gt: ['$imagesCount', 0] }, hasFile: { $gt: ['$filesCount', 0] } } },

      // 목록에 불필요한 필드 제외
      { $project: { content: 0, attachments: 0, attachmentsArr: 0 } },
    ])
    .toArray();

  // QnA 5개 (최신순) — 필요하면 뱃지용 필드 추가
  const qnaRaw = await col
    .aggregate([
      {
        $match: {
          type: 'qna',
          status: 'published',
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },
      {
        $addFields: {
          // 안전하게 정규화(클라에서 권한판단/뱃지표시용)
          isSecret: { $ifNull: ['$isSecret', false] },
          authorId: {
            $convert: { input: '$authorId', to: 'string', onError: null, onNull: null },
          },
        },
      },

      // 첨부 플래그도 같이 내려주고 싶으면 동일하게 추가 가능
      { $addFields: { attachmentsArr: { $ifNull: ['$attachments', []] } } },
      {
        $addFields: {
          imagesCount: {
            $size: {
              $filter: {
                input: '$attachmentsArr',
                as: 'a',
                cond: {
                  $or: [{ $regexMatch: { input: { $ifNull: ['$$a.mime', ''] }, regex: /^image\// } }, { $regexMatch: { input: { $ifNull: ['$$a.url', ''] }, regex: /\.(png|jpe?g|gif|webp|bmp|svg)$/i } }],
                },
              },
            },
          },
          filesCount: {
            $size: {
              $filter: {
                input: '$attachmentsArr',
                as: 'a',
                cond: {
                  $and: [{ $not: [{ $regexMatch: { input: { $ifNull: ['$$a.mime', ''] }, regex: /^image\// } }] }, { $not: [{ $regexMatch: { input: { $ifNull: ['$$a.url', ''] }, regex: /\.(png|jpe?g|gif|webp|bmp|svg)$/i } }] }],
                },
              },
            },
          },
        },
      },
      { $addFields: { hasImage: { $gt: ['$imagesCount', 0] }, hasFile: { $gt: ['$filesCount', 0] } } },

      { $project: { content: 0, attachments: 0, attachmentsArr: 0 } },
    ])
    .toArray();

  // “작성자/관리자만 원문 제목”, 그 외는 마스킹
  const qna = (qnaRaw as any[]).map((it) =>
    maskSecretTitle(it, {
      viewerId: viewer.viewerId,
      isAdmin: viewer.isAdmin,
    }),
  );

  return NextResponse.json({ ok: true, version: API_VERSION, notices, qna }, { headers: { 'Cache-Control': 'no-store' } });
}
