import { verifyAccessToken } from "@/lib/auth.utils";
import { racketBrandLabel } from "@/lib/constants";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const jar = await cookies();
  const token = jar.get("accessToken")?.value;
  if (!token)
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  // verifyAccessToken이 만료/깨진 토큰에서 throw 되어도 500이 아니라 401로 정리
  let payload: any = null;
  try {
    payload = verifyAccessToken(token);
  } catch {
    payload = null;
  }

  // sub는 ObjectId 문자열이어야 함 (new ObjectId에서 500 방지)
  const subStr = payload?.sub ? String(payload.sub) : "";
  if (!subStr || !ObjectId.isValid(subStr))
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });

  const db = await getDb();
  const userId = new ObjectId(subStr);

  const url = new URL(req.url);
  // limit 파싱: NaN이면 Mongo $limit에서 터질 수 있으므로 정수/클램프 처리
  const limitRaw = parseInt(url.searchParams.get("limit") || "10", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(50, limitRaw))
    : 10;
  const cursorB64 = url.searchParams.get("cursor");

  // 커서: createdAt desc, _id desc
  let cursorMatch: any = {};
  if (cursorB64) {
    try {
      const c = JSON.parse(Buffer.from(cursorB64, "base64").toString("utf-8"));
      const createdAt = new Date(String(c?.createdAt ?? ""));
      const idStr = String(c?.id ?? "");
      // 커서 값이 깨졌을 때(Invalid Date / 잘못된 id)는 무시하고 첫 페이지로 처리
      if (Number.isFinite(createdAt.getTime()) && ObjectId.isValid(idStr)) {
        cursorMatch = {
          $or: [
            { createdAt: { $lt: createdAt } },
            { createdAt, _id: { $lt: new ObjectId(idStr) } },
          ],
        };
      }
    } catch {
      /* ignore */
    }
  }

  const rows = await db
    .collection("reviews")
    .aggregate([
      { $match: { userId, isDeleted: { $ne: true } } },
      { $match: cursorMatch },
      { $sort: { createdAt: -1, _id: -1 } },
      { $limit: limit + 1 },

      // productId는 ObjectId/문자열(레거시) 둘 다 올 수 있어 방어적으로 ObjectId로 정규화
      {
        $addFields: {
          productIdObj: {
            $cond: [
              { $eq: [{ $type: "$productId" }, "objectId"] },
              "$productId",
              {
                $cond: [
                  {
                    $and: [
                      { $eq: [{ $type: "$productId" }, "string"] },
                      {
                        $regexMatch: {
                          input: "$productId",
                          regex: /^[0-9a-fA-F]{24}$/,
                        },
                      },
                    ],
                  },
                  { $toObjectId: "$productId" },
                  null,
                ],
              },
            ],
          },
        },
      },

      // 상품 메타(상품 리뷰일 때만)
      {
        $lookup: {
          from: "products",
          localField: "productIdObj",
          foreignField: "_id",
          as: "product",
          pipeline: [
            { $project: { name: 1, title: 1, thumbnail: 1, images: 1 } },
          ],
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },

      // 라켓 메타(used_rackets)조회 fallback
      {
        $lookup: {
          from: "used_rackets",
          localField: "productIdObj",
          foreignField: "_id",
          as: "racket",
          pipeline: [{ $project: { brand: 1, model: 1, images: 1 } }],
        },
      },
      { $unwind: { path: "$racket", preserveNullAndEmptyArrays: true } },

      // 서비스(스트링) 메타: 신청서에서 교체한 스트링 상품명 가져오기
      // - serviceApplicationId가 ObjectId/문자열 둘 다 올 수 있어 방어적으로 ObjectId로 정규화
      {
        $addFields: {
          serviceAppIdObj: {
            $cond: [
              { $eq: [{ $type: "$serviceApplicationId" }, "objectId"] },
              "$serviceApplicationId",
              {
                $cond: [
                  {
                    $and: [
                      { $eq: [{ $type: "$serviceApplicationId" }, "string"] },
                      {
                        $regexMatch: {
                          input: "$serviceApplicationId",
                          regex: /^[0-9a-fA-F]{24}$/,
                        },
                      },
                    ],
                  },
                  { $toObjectId: "$serviceApplicationId" },
                  null,
                ],
              },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "stringing_applications",
          localField: "serviceAppIdObj",
          foreignField: "_id",
          as: "application",
          pipeline: [{ $project: { stringDetails: 1 } }],
        },
      },
      { $unwind: { path: "$application", preserveNullAndEmptyArrays: true } },

      // 서비스 제목 생성: "스트링 교체 서비스 - (스트링 상품명)"
      // 서비스 대상 스트링 이름 추출
      {
        $addFields: {
          // service 필드가 없던 과거 문서도 커버 (serviceApplicationId가 있으면 서비스 리뷰로 간주)
          isStringingReview: {
            $or: [
              { $eq: ["$service", "stringing"] },
              { $ne: ["$serviceApplicationId", null] },
            ],
          },
          serviceTargetName: {
            $let: {
              vars: {
                fromItems: {
                  $map: {
                    input: {
                      $ifNull: ["$application.stringDetails.stringItems", []],
                    },
                    as: "s",
                    in: "$$s.name",
                  },
                },
                fromLines: {
                  $map: {
                    input: {
                      $ifNull: ["$application.stringDetails.racketLines", []],
                    },
                    as: "r",
                    in: "$$r.stringName",
                  },
                },
              },
              in: {
                $let: {
                  vars: { all: { $setUnion: ["$$fromItems", "$$fromLines"] } },
                  in: { $arrayElemAt: ["$$all", 0] },
                },
              },
            },
          },
        },
      },
      // 제목 문자열 생성: "스트링 교체 서비스 - (스트링 상품명)"
      {
        $addFields: {
          serviceTitle: {
            $cond: [
              "$isStringingReview",
              {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$serviceTargetName", null] },
                      { $ne: ["$serviceTargetName", ""] },
                    ],
                  },
                  { $concat: ["스트링 교체 서비스 - ", "$serviceTargetName"] },
                  "스트링 교체 서비스",
                ],
              },
              null,
            ],
          },
        },
      },

      // 필요한 필드만 정리
      {
        $project: {
          _id: 1,
          rating: 1,
          content: 1,
          createdAt: 1,
          updatedAt: 1,
          status: {
            $cond: [{ $eq: ["$status", "hidden"] }, "hidden", "visible"],
          },
          photos: { $ifNull: ["$photos", []] },

          // used_rackets 이름 보정용(응답에는 노출하지 않고 서버에서 name을 채운 뒤 제거)
          __racketBrand: "$racket.brand",
          __racketModel: "$racket.model",
          __racketImages: "$racket.images",

          productId: 1,
          service: 1,
          serviceApplicationId: 1,

          target: {
            type: {
              $cond: [{ $ifNull: ["$productId", false] }, "product", "service"],
            },
            name: {
              $cond: [
                { $ifNull: ["$productId", false] },
                {
                  $ifNull: [
                    { $ifNull: ["$product.name", "$product.title"] },
                    {
                      $cond: [
                        {
                          $and: [
                            { $ne: ["$racket.model", null] },
                            { $ne: ["$racket.model", ""] },
                          ],
                        },
                        {
                          $concat: [
                            { $ifNull: ["$racket.brand", ""] },
                            " ",
                            { $ifNull: ["$racket.model", ""] },
                          ],
                        },
                        "상품",
                      ],
                    },
                  ],
                },
                { $ifNull: ["$serviceTitle", "서비스 리뷰"] },
              ],
            },
            image: {
              $cond: [
                { $ifNull: ["$productId", false] },
                {
                  $ifNull: [
                    {
                      $ifNull: [
                        "$product.thumbnail",
                        { $arrayElemAt: ["$product.images", 0] },
                      ],
                    },
                    {
                      $ifNull: [
                        "$racket.thumbnail",
                        { $arrayElemAt: ["$racket.images", 0] },
                      ],
                    },
                  ],
                },
                null,
              ],
            },
          },
        },
      },
    ])
    .toArray();

  // 커서 계산
  let nextCursor: string | null = null;
  if (rows.length > limit) {
    const last = rows[limit - 1];
    rows.length = limit;
    nextCursor = Buffer.from(
      JSON.stringify({ id: String(last._id), createdAt: last.createdAt }),
      "utf-8",
    ).toString("base64");
  }

  // target.name 보정(라켓/레거시): Mongo 집계에서 브랜드 라벨(헤드/윌슨 등) 매핑이 어려워 서버에서 최종 보정
  const items = rows.map((row: any) => {
    const brand = row?.__racketBrand;
    const model = row?.__racketModel;

    if (row?.target?.type === "product" && brand && model) {
      const brandStr = String(brand).trim();
      const modelStr = String(model).trim();
      const computed = `${racketBrandLabel(brandStr)} ${modelStr}`.trim();

      // 1) name이 비었거나 일반값이면 라켓명으로 채움
      const curName =
        typeof row?.target?.name === "string" ? row.target.name.trim() : "";
      if (
        !curName ||
        curName === "상품" ||
        curName === "라켓" ||
        curName === "상품 리뷰"
      ) {
        row.target.name = computed;
      } else {
        // 2) 집계 fallback이 "head 라켓모델1"처럼 코드가 그대로 들어온 경우 → 라벨로 교체
        const raw = `${brandStr} ${modelStr}`.trim();
        if (curName === raw) row.target.name = computed;
      }

      // image도 비어 있으면 첫 이미지로 보정
      if (
        !row?.target?.image &&
        Array.isArray(row?.__racketImages) &&
        row.__racketImages.length
      ) {
        row.target.image = row.__racketImages[0];
      }
    }

    // 내부 보정용 필드 제거
    delete row.__racketBrand;
    delete row.__racketModel;
    delete row.__racketImages;

    return row;
  });

  return NextResponse.json({ items, nextCursor });
}
