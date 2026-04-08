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
  message: string;
  statusCode?: number;
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
        statusCode: response.status,
        message: "배송조회 서비스 응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
      };
    }

    const payload = await response.json().catch(() => null);
    if (!payload || Array.isArray(payload?.errors) || !payload?.data?.track) {
      return {
        success: false,
        statusCode: 502,
        message: "배송조회 서비스 응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
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
      statusCode: 503,
      message: "배송조회 서비스 응답을 가져오지 못했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}
