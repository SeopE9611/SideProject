import "server-only";

import https from "node:https";

import {
  APPS_IN_TOSS_API_HOST,
  APPS_IN_TOSS_HTTP_TIMEOUT_MS,
  APPS_IN_TOSS_MAX_RESPONSE_BYTES,
  getAppsInTossMtlsCredentials,
} from "./config";

export class TossApiError extends Error {
  constructor(
    public readonly kind: "network" | "timeout" | "response_too_large" | "invalid_response" | "api_error",
    public readonly status?: number,
    public readonly tossCode?: string,
  ) {
    super("Apps in Toss 인증 요청을 처리하지 못했습니다.");
    this.name = "TossApiError";
  }
}

type MtlsJsonRequest = {
  method: "GET" | "POST";
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export function requestTossJson({ method, path, headers = {}, body }: MtlsJsonRequest): Promise<unknown> {
  const payload = body === undefined ? undefined : Buffer.from(JSON.stringify(body), "utf8");
  const credentials = getAppsInTossMtlsCredentials();

  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: APPS_IN_TOSS_API_HOST,
        port: 443,
        method,
        path,
        cert: credentials.cert,
        key: credentials.key,
        headers: {
          Accept: "application/json",
          ...(payload ? { "Content-Type": "application/json", "Content-Length": String(payload.length) } : {}),
          ...headers,
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        let receivedBytes = 0;

        response.on("data", (chunk: Buffer) => {
          receivedBytes += chunk.length;
          if (receivedBytes > APPS_IN_TOSS_MAX_RESPONSE_BYTES) {
            response.destroy(new TossApiError("response_too_large", response.statusCode));
            return;
          }
          chunks.push(chunk);
        });

        response.on("end", () => {
          const contentType = response.headers["content-type"]?.toLowerCase() ?? "";
          if (!contentType.includes("application/json")) {
            reject(new TossApiError("invalid_response", response.statusCode));
            return;
          }
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown);
          } catch {
            reject(new TossApiError("invalid_response", response.statusCode));
          }
        });
        response.on("error", (error) => {
          reject(error instanceof TossApiError ? error : new TossApiError("network", response.statusCode));
        });
      },
    );

    request.setTimeout(APPS_IN_TOSS_HTTP_TIMEOUT_MS, () => {
      request.destroy(new TossApiError("timeout"));
    });
    request.on("error", (error) => {
      reject(error instanceof TossApiError ? error : new TossApiError("network"));
    });
    if (payload) request.write(payload);
    request.end();
  });
}
