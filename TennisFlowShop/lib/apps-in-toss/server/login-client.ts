import "server-only";

import { z } from "zod";

import { requestTossJson, TossApiError } from "./http";

const TossFailureSchema = z.object({
  resultType: z.literal("FAIL"),
  error: z.object({ errorCode: z.string(), reason: z.string() }).passthrough(),
});

const InvalidGrantSchema = z.object({
  error: z.literal("invalid_grant"),
}).passthrough();

const ExpiresInSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().positive()),
]);

const TokenSuccessSchema = z.object({
  resultType: z.literal("SUCCESS"),
  success: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    tokenType: z.string().min(1),
    expiresIn: ExpiresInSchema,
    scope: z.string(),
  }).passthrough(),
});

const LoginUserSuccessSchema = z.object({
  resultType: z.literal("SUCCESS"),
  success: z.object({
    userKey: z.number().refine((value) => Number.isSafeInteger(value) && value > 0),
    name: z.string().min(1),
    scope: z.string(),
    agreedTerms: z.unknown().optional(),
  }).passthrough(),
});

function parseTossResponse<T>(value: unknown, schema: z.ZodType<T>): T {
  const invalidGrant = InvalidGrantSchema.safeParse(value);
  if (invalidGrant.success) throw new TossApiError("invalid_grant");
  const failure = TossFailureSchema.safeParse(value);
  if (failure.success) throw new TossApiError("api_error", undefined, failure.data.error.errorCode);
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new TossApiError("invalid_response");
  return parsed.data;
}

export type AppsInTossReferrer = "DEFAULT" | "SANDBOX";

export async function exchangeAuthorizationCode(input: {
  authorizationCode: string;
  referrer: AppsInTossReferrer;
}) {
  const response = await requestTossJson({
    method: "POST",
    path: "/api-partner/v1/apps-in-toss/user/oauth2/generate-token",
    body: input,
  });
  return parseTossResponse(response, TokenSuccessSchema).success;
}

export async function getTossLoginUser(accessToken: string) {
  const response = await requestTossJson({
    method: "GET",
    path: "/api-partner/v1/apps-in-toss/user/oauth2/login-me",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return parseTossResponse(response, LoginUserSuccessSchema).success;
}

export function normalizeTossUserKey(userKey: unknown) {
  if (typeof userKey !== "number" || !Number.isSafeInteger(userKey) || userKey <= 0) {
    throw new TossApiError("invalid_response");
  }
  return String(userKey);
}
