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
      lastEvent {
        time
        status {
          id
          text
        }
        location {
          name
        }
        description
      }
      progresses {
        time
        status {
          id
          text
        }
        location {
          name
        }
        description
      }
      state {
        id
        text
      }
      carrier {
        id
        name
      }
    }
  }
`;

const IN_TRANSIT_STATE_IDS = new Set([
  "in_transit",
  "out_for_delivery",
  "at_pickup",
  "pickup_complete",
  "picked_up",
]);

function normalizeProgress(item: any): DeliveryTrackerProgressItem {
  return {
    time: item?.time ? String(item.time) : null,
    statusText: item?.status?.text ? String(item.status.text) : null,
    locationName: item?.location?.name ? String(item.location.name) : null,
    description: item?.description ? String(item.description) : null,
  };
}

function normalizeDisplayStatus(stateId: string | null): DeliveryStatus {
  if (!stateId) return "조회불가";
  if (stateId === "delivered") return "배송완료";
  if (IN_TRANSIT_STATE_IDS.has(stateId)) return "배송중";
  return "배송준비중";
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
}): Promise<DeliveryTrackerSummarySuccess | DeliveryTrackerSummaryFailure> {
  const { carrierId, trackingNumber, clientId, clientSecret } = params;
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
    const stateId = track?.state?.id ? String(track.state.id) : null;
    const progresses = Array.isArray(track?.progresses)
      ? track.progresses.slice(-3).reverse().map(normalizeProgress)
      : [];

    const lastEvent = track?.lastEvent ? normalizeProgress(track.lastEvent) : null;

    return {
      success: true,
      carrierId,
      carrierName: track?.carrier?.name ? String(track.carrier.name) : null,
      trackingNumber,
      stateId,
      stateText: track?.state?.text ? String(track.state.text) : null,
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
