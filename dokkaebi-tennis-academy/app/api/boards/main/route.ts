import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  const db = await getDb();
  const col = db.collection('board_posts');

  // 공지 5개 (고정 우선)
  const notices = await col
    .aggregate([
      { $match: { type: 'notice', status: 'published' } },
      { $sort: { isPinned: -1, createdAt: -1 } },
      { $limit: 5 },

      // ✅ attachments 보정
      { $addFields: { attachmentsArr: { $ifNull: ['$attachments', []] } } },

      // ✅ 이미지/파일 카운트 & 플래그
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

      // ✅ 목록에 불필요한 필드 제외
      { $project: { content: 0, attachments: 0, attachmentsArr: 0 } },
    ])
    .toArray();

  // QnA 5개 (최신순) — 필요하면 뱃지용 필드 추가
  const qna = await col
    .aggregate([
      { $match: { type: 'qna', status: 'published' } },
      { $sort: { createdAt: -1 } },
      { $limit: 5 },

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

  return NextResponse.json({ ok: true, notices, qna });
}
