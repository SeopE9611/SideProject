import jwt, { Secret, SignOptions } from "jsonwebtoken";

// .env.local에 정의된 Access Token 서명용 시크릿 키를 불러온다.
// 이 키는 서버만 알고 있어야 하며, Access Token의 위조 여부를 검증하는 데 사용된다.
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;

/**
 * 요청 헤더에서 Authorization 값을 파싱하여 Bearer 토큰을 추출한다.
 * @param headers Request Headers 객체
 * @returns Bearer <token> 형식에서 <token> 부분 반환
 */
export function getTokenFromHeader(headers: Headers): string | null {
  const authorization = headers.get("Authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) return null;
  return authorization.split(" ")[1]; // "Bearer abcd.efgh.ijkl" → "abcd.efgh.ijkl"
}

/**
 * 클라이언트가 보낸 Access Token을 검증하고,
 * 유효한 경우 Payload(사용자 정보 등)를 반환한다.
 *
 * @param token 클라이언트로부터 전달받은 JWT 문자열
 * @returns 유효한 경우 Payload (sub, email, role 등 포함), 유효하지 않으면 null 반환
 */
export function verifyAccessToken(token: string) {
  try {
    // jwt.verify는 서명을 검증하고 만료 여부를 확인한다.
    // 서명이 유효하고 만료되지 않았다면 Payload 객체를 반환한다.
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as jwt.JwtPayload;
  } catch (err) {
    // 만료됐거나 위조된 경우 null을 반환한다.
    return null;
  }
}

function getOrderScopedTokenSecret(): Secret {
  return process.env.ORDER_ACCESS_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET!;
}

export type OrderScopedAccessTokenPayload =
  | { orderId: string; emailHash?: string }
  | { rentalId: string; emailHash?: string };

//  주문 접근 전용 토큰 발급 (게스트용)
export function signOrderAccessToken(
  payload: OrderScopedAccessTokenPayload,
  // 7일(초)로 기본값 설정
  expiresIn: SignOptions["expiresIn"] = 60 * 60 * 24 * 7,
) {
  const secret = getOrderScopedTokenSecret();
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, secret, options);
}

// 주문 접근 전용 토큰 검증 (게스트용)
export function verifyOrderAccessToken(token: string) {
  try {
    const secret = getOrderScopedTokenSecret();
    return jwt.verify(token, secret) as OrderScopedAccessTokenPayload & {
      iat: number;
      exp: number;
    };
  } catch {
    return null;
  }
}

export type GuestRentalAccessTokenPayload = {
  scope: "guest_rental";
  rentalId: string;
};

export function signRentalAccessToken(
  payload: GuestRentalAccessTokenPayload,
  expiresIn: SignOptions["expiresIn"] = 60 * 60 * 24 * 7,
) {
  if (
    payload.scope !== "guest_rental" ||
    !OBJECT_ID_TEXT_RE.test(String(payload.rentalId).trim())
  ) {
    throw new Error("INVALID_GUEST_RENTAL_ACCESS_PAYLOAD");
  }
  return jwt.sign(
    { scope: "guest_rental", rentalId: String(payload.rentalId).trim() },
    getOrderScopedTokenSecret(),
    { expiresIn },
  );
}

export function verifyRentalAccessToken(token: string): GuestRentalAccessTokenPayload | null {
  try {
    const claims = jwt.verify(token, getOrderScopedTokenSecret()) as jwt.JwtPayload;
    const rentalId = typeof claims.rentalId === "string" ? claims.rentalId.trim() : "";
    return claims.scope === "guest_rental" && OBJECT_ID_TEXT_RE.test(rentalId)
      ? { scope: "guest_rental", rentalId }
      : null;
  } catch {
    return null;
  }
}

export function hasDedicatedGuestRentalAccess(
  claims: ReturnType<typeof verifyRentalAccessToken>,
  rentalId: string,
): boolean {
  const normalizedRentalId = String(rentalId).trim();
  return Boolean(
    OBJECT_ID_TEXT_RE.test(normalizedRentalId) &&
    claims?.scope === "guest_rental" &&
    claims.rentalId === normalizedRentalId,
  );
}

export function signApplicationAccessToken(
  payload: { applicationId: string },
  expiresIn: SignOptions["expiresIn"] = 60 * 60 * 24 * 7,
) {
  const secret = getOrderScopedTokenSecret();
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, secret, options);
}

export function verifyApplicationAccessToken(token: string) {
  try {
    const secret = getOrderScopedTokenSecret();
    return jwt.verify(token, secret) as {
      applicationId: string;
      iat: number;
      exp: number;
    };
  } catch {
    return null;
  }
}

export type GuestOrderLookupAccessTokenPayload = {
  scope: "guest_order_lookup";
  orderIds: string[];
};

const OBJECT_ID_TEXT_RE = /^[a-f0-9]{24}$/i;

export function hasGuestOrderAccess(
  claims: ReturnType<typeof verifyOrderAccessToken>,
  orderId: string,
): boolean {
  const normalizedOrderId = String(orderId).trim();
  return Boolean(
    OBJECT_ID_TEXT_RE.test(normalizedOrderId) &&
    claims &&
    "orderId" in claims &&
    claims.orderId === normalizedOrderId,
  );
}

export function hasGuestRentalAccess(
  claims: ReturnType<typeof verifyOrderAccessToken>,
  rentalId: string,
): boolean {
  const normalizedRentalId = String(rentalId).trim();
  return Boolean(
    OBJECT_ID_TEXT_RE.test(normalizedRentalId) &&
    claims &&
    "rentalId" in claims &&
    claims.rentalId === normalizedRentalId,
  );
}

function normalizeGuestOrderLookupOrderIds(orderIds: unknown): string[] | null {
  if (!Array.isArray(orderIds) || orderIds.length > 50) return null;

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const orderId of orderIds) {
    const value = String(orderId).trim();
    if (!OBJECT_ID_TEXT_RE.test(value)) return null;
    if (!seen.has(value)) {
      seen.add(value);
      normalized.push(value);
    }
  }

  return normalized.length >= 1 && normalized.length <= 50 ? normalized : null;
}

export function signGuestOrderLookupAccessToken(
  payload: GuestOrderLookupAccessTokenPayload,
  expiresIn: SignOptions["expiresIn"] = 60 * 30,
) {
  const orderIds = normalizeGuestOrderLookupOrderIds(payload.orderIds);
  if (!orderIds || payload.scope !== "guest_order_lookup") {
    throw new Error("INVALID_GUEST_ORDER_LOOKUP_PAYLOAD");
  }

  return jwt.sign({ scope: "guest_order_lookup", orderIds }, getOrderScopedTokenSecret(), {
    expiresIn,
  });
}

export function verifyGuestOrderLookupAccessToken(
  token: string,
): GuestOrderLookupAccessTokenPayload | null {
  try {
    const claims = jwt.verify(token, getOrderScopedTokenSecret()) as jwt.JwtPayload;
    const orderIds = normalizeGuestOrderLookupOrderIds(claims.orderIds);
    return claims.scope === "guest_order_lookup" && orderIds
      ? { scope: "guest_order_lookup", orderIds }
      : null;
  } catch {
    return null;
  }
}

export function hasGuestOrderLookupAccess(
  claims: ReturnType<typeof verifyGuestOrderLookupAccessToken>,
  orderId: string,
) {
  const normalizedOrderId = String(orderId).trim();
  return Boolean(
    OBJECT_ID_TEXT_RE.test(normalizedOrderId) && claims?.orderIds.includes(normalizedOrderId),
  );
}
