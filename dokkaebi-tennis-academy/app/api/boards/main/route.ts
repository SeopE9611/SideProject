import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import { API_VERSION } from '@/lib/board.repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  const me = await getCurrentUser();
  const viewerId = me?.id ?? null;
  const isAdmin = me?.role === 'admin';
  const db = await getDb();
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
          titleRaw: '$title',
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
  const qna = (qnaRaw as any[]).map((it) => {
    const isSecret = Boolean(it?.isSecret);
    const authorId = it?.authorId ?? null;
    const canSeeTitle = !isSecret || isAdmin || (viewerId && authorId && String(viewerId) === String(authorId));

    const title = canSeeTitle ? (it?.titleRaw ?? it?.title ?? '비밀글입니다') : '비밀글입니다';
    const { titleRaw, ...rest } = it; // titleRaw는 응답에서 제거(유출 방지)
    return { ...rest, title };
  });

  return NextResponse.json({ ok: true, version: API_VERSION, notices, qna }, { headers: { 'Cache-Control': 'no-store' } });
}
