export type AdminOperationalAlertKind =
  | "order_created"
  | "academy_application_created"
  | "stringing_application_submitted"
  | "package_order_created"
  | "cancel_requested";

export type AdminOperationalAlertPayload = {
  kind: AdminOperationalAlertKind;
  title: string;
  summary: string;
  href: string;
  fields?: Array<{ name: string; value: string }>;
  dedupeKey: string;
  priority?: "normal" | "high";
};

type AdminOperationalAlertProvider = {
  send: (payload: AdminOperationalAlertPayload, absoluteUrl: string) => Promise<void>;
};

function buildAbsoluteUrl(href: string) {
  try {
    return new URL(href).toString();
  } catch {
    const baseUrl = process.env.ADMIN_ALERT_BASE_URL || "";
    if (!baseUrl) return href;
    try {
      return new URL(href, baseUrl).toString();
    } catch {
      return href;
    }
  }
}

function createDiscordProvider(webhookUrl: string): AdminOperationalAlertProvider {
  return {
    async send(payload, absoluteUrl) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      try {
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            allowed_mentions: { parse: [] },
            embeds: [
              {
                title: payload.title,
                description: payload.summary,
                url: absoluteUrl,
                fields: payload.fields?.map((field) => ({
                  name: field.name,
                  value: field.value || "-",
                  inline: true,
                })),
                footer: { text: "도깨비테니스 운영 알림" },
                timestamp: new Date().toISOString(),
              },
            ],
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          console.error("[admin-alerts] Discord webhook failed", {
            status: response.status,
            kind: payload.kind,
            dedupeKey: payload.dedupeKey,
          });
        }
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function getEnabledProviders() {
  const webhookUrl = process.env.ADMIN_ALERT_DISCORD_WEBHOOK_URL;
  const providers: AdminOperationalAlertProvider[] = [];

  if (webhookUrl) {
    providers.push(createDiscordProvider(webhookUrl));
  }

  return providers;
}

export async function sendAdminOperationalAlert(payload: AdminOperationalAlertPayload) {
  try {
    if (process.env.ADMIN_ALERTS_ENABLED === "false") return;

    const providers = getEnabledProviders();
    if (providers.length === 0) return;

    const absoluteUrl = buildAbsoluteUrl(payload.href);
    await Promise.all(providers.map((provider) => provider.send(payload, absoluteUrl)));
  } catch (error) {
    console.error("[admin-alerts] send failed", {
      kind: payload.kind,
      dedupeKey: payload.dedupeKey,
      error,
    });
  }
}
