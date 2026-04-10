const DELIVERY_TRACKER_GRAPHQL_ENDPOINT = "https://apis.tracker.delivery/graphql";

type DeliveryStatus = "배송준비중" | "배송중" | "배송완료" | "조회불가";

type DeliveryTrackerProgressItem = {
  time: string | null;
  statusText: string | null;
  locationName: string | null;
  description: string | null;
};

export type DeliveryTrackerSummarySuccess = {
  success: true;
  carrierId: string;
  carrierName: string | null;
  trackingNumber: string;
  stateId: string | null;
  stateText: string | null;
  displayStatus: DeliveryStatus;
  linkUrl: string;
  lastEvent: DeliveryTrackerProgressItem | null;
  progresses: DeliveryTrackerProgressItem[];
};

export type DeliveryTrackerSummaryFailure = {
  success: false;
  errorCode:
    | "NOT_FOUND"
    | "BAD_REQUEST"
    | "UNAUTHENTICATED"
    | "FORBIDDEN"
    | "INTERNAL"
    | "UNKNOWN";
  message: string;
  statusCode: number;
};

const TRACKING_QUERY = `
  query Track($carrierId: ID!, $trackingNumber: String!) {
    track(carrierId: $carrierId, trackingNumber: $trackingNumber) {
      trackingNumber
      lastEvent {
        time
        status {
          code
          name
        }
        location {
          name
        }
        description
      }
      events(last: 3) {
        edges {
          node {
            time
            status {
              code
              name
            }
            location {
              name
            }
            description
          }
        }
      }
    }
  }
`;

const IN_TRANSIT_STATE_CODES = new Set([
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "AT_PICKUP",
  "AVAILABLE_FOR_PICKUP",
  "PICKUP_COMPLETE",
  "PICKED_UP",
]);

type DeliveryTrackerErrorInfo = Pick<
  DeliveryTrackerSummaryFailure,
  "errorCode" | "message" | "statusCode"
>;

function maskTrackingNumber(trackingNumber: string): string {
  const trimmed = String(trackingNumber ?? "").trim();
  if (!trimmed) return "****";
  const suffix = trimmed.slice(-4);
  return `${"*".repeat(Math.max(trimmed.length - 4, 3))}${suffix}`;
}

function getDeliveryTrackerErrorInfo(payload: any): DeliveryTrackerErrorInfo {
  const rawCode = payload?.errors?.[0]?.extensions?.code;
  const code = String(rawCode ?? "UNKNOWN").toUpperCase();

  switch (code) {
    case "NOT_FOUND":
      return {
        errorCode: "NOT_FOUND",
        statusCode: 404,
        message:
          "해당 운송장을 조회할 수 없습니다. 택배사 또는 운송장 번호를 확인해주세요.",
      };
    case "BAD_REQUEST":
      return {
        errorCode: "BAD_REQUEST",
        statusCode: 400,
        message: "운송장 번호 형식이 올바르지 않습니다.",
      };
    case "UNAUTHENTICATED":
      return {
        errorCode: "UNAUTHENTICATED",
        statusCode: 503,
        message: "배송조회 인증 설정이 올바르지 않거나 만료되었습니다.",
      };
    case "FORBIDDEN":
      return {
        errorCode: "FORBIDDEN",
        statusCode: 503,
        message: "배송조회 서비스 접근 권한이 없습니다.",
      };
    case "INTERNAL":
      return {
        errorCode: "INTERNAL",
        statusCode: 502,
        message: "배송조회 서비스 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      };
    default:
      return {
        errorCode: "UNKNOWN",
        statusCode: 502,
        message: "배송조회 정보를 불러오지 못했습니다.",
      };
  }
}

function normalizeProgress(item: any): DeliveryTrackerProgressItem {
  return {
    time: item?.time ? String(item.time) : null,
    statusText: item?.status?.name ? String(item.status.name) : null,
    locationName: item?.location?.name ? String(item.location.name) : null,
    description: item?.description ? String(item.description) : null,
  };
}

function normalizeDisplayStatus(stateCode: string | null): DeliveryStatus {
  const normalizedCode = stateCode ? String(stateCode).toUpperCase() : "";
  if (!normalizedCode) return "조회불가";
  if (normalizedCode === "DELIVERED") return "배송완료";
  if (IN_TRANSIT_STATE_CODES.has(normalizedCode)) return "배송중";
  if (
    normalizedCode === "INFO_RECEIVED" ||
    normalizedCode === "PENDING" ||
    normalizedCode === "PRE_TRANSIT"
  ) {
    return "배송준비중";
  }
  return "조회불가";
}

export function buildDeliveryTrackerLink(params: {
  clientId: string;
  carrierId: string;
  trackingNumber: string;
}): string {
  const search = new URLSearchParams({
    client_id: params.clientId,
    carrier_id: params.carrierId,
    tracking_number: params.trackingNumber,
  });
  return `https://link.tracker.delivery/track?${search.toString()}`;
}

export async function fetchDeliveryTrackerSummary(params: {
  carrierId: string;
  trackingNumber: string;
  clientId: string;
  clientSecret: string;
  carrierDisplayName?: string | null;
}): Promise<DeliveryTrackerSummarySuccess | DeliveryTrackerSummaryFailure> {
  const { carrierId, trackingNumber, clientId, clientSecret, carrierDisplayName } =
    params;
  const auth = `TRACKQL-API-KEY ${clientId}:${clientSecret}`;

  try {
    const response = await fetch(DELIVERY_TRACKER_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        "Accept-Language": "ko",
      },
      body: JSON.stringify({
        query: TRACKING_QUERY,
        variables: { carrierId, trackingNumber },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        success: false,
        errorCode: response.status === 401 ? "UNAUTHENTICATED" : "UNKNOWN",
        statusCode: response.status,
        message: "배송조회 서비스 응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
      };
    }

    const payload = await response.json().catch(() => null);
    if (!payload) {
      return {
        success: false,
        errorCode: "UNKNOWN",
        statusCode: 502,
        message: "배송조회 서비스 응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
      };
    }
    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      const errorInfo = getDeliveryTrackerErrorInfo(payload);
      console.warn("[delivery-tracker] graphql-error", {
        errorCode: errorInfo.errorCode,
        carrierId,
        trackingNumber: maskTrackingNumber(trackingNumber),
      });
      return { success: false, ...errorInfo };
    }
    if (!payload?.data?.track) {
      return {
        success: false,
        errorCode: "UNKNOWN",
        statusCode: 502,
        message: "배송조회 정보를 불러오지 못했습니다.",
      };
    }

    const track = payload.data.track;
    const stateId = track?.lastEvent?.status?.code
      ? String(track.lastEvent.status.code)
      : null;
    const progresses = Array.isArray(track?.events?.edges)
      ? track.events.edges
          .map((edge: any) => edge?.node)
          .filter(Boolean)
          .map(normalizeProgress)
          .reverse()
      : [];

    const lastEvent = track?.lastEvent ? normalizeProgress(track.lastEvent) : null;

    return {
      success: true,
      carrierId,
      carrierName: carrierDisplayName ? String(carrierDisplayName) : null,
      trackingNumber,
      stateId,
      stateText: track?.lastEvent?.status?.name
        ? String(track.lastEvent.status.name)
        : null,
      displayStatus: normalizeDisplayStatus(stateId),
      linkUrl: buildDeliveryTrackerLink({ clientId, carrierId, trackingNumber }),
      lastEvent,
      progresses,
    };
  } catch {
    return {
      success: false,
      errorCode: "UNKNOWN",
      statusCode: 503,
      message: "배송조회 서비스 응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
