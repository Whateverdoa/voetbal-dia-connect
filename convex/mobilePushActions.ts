"use node";

import { createPrivateKey, sign } from "node:crypto";
import { connect } from "node:http2";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

type NotificationType =
  | "offer_sent"
  | "offer_reminder"
  | "offer_expired"
  | "offer_withdrawn"
  | "assignment_confirmed"
  | "assignment_cancelled";

type ApnsResponse = {
  status: number;
  providerId?: string;
  reason?: string;
};

const APNS_REQUEST_TIMEOUT_MS = 10_000;

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function providerToken(keyId: string, teamId: string, privateKey: string) {
  const header = base64Url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const claims = base64Url(
    JSON.stringify({ iss: teamId, iat: Math.floor(Date.now() / 1000) })
  );
  const unsigned = `${header}.${claims}`;
  const key = createPrivateKey(privateKey.replace(/\\n/g, "\n"));
  const signature = sign("sha256", Buffer.from(unsigned), {
    key,
    dsaEncoding: "ieee-p1363",
  });
  return `${unsigned}.${base64Url(signature)}`;
}

function genericAlert(notificationType: NotificationType) {
  switch (notificationType) {
    case "offer_sent":
      return ["Nieuwe wedstrijdaanvraag", "Er staat een nieuw offer voor je klaar."];
    case "offer_reminder":
      return ["Offer verloopt binnenkort", "Reageer op je open wedstrijdoffer."];
    case "offer_expired":
      return ["Offer verlopen", "Dit wedstrijdoffer is niet meer beschikbaar."];
    case "offer_withdrawn":
      return ["Offer ingetrokken", "De planning voor dit offer is gewijzigd."];
    case "assignment_confirmed":
      return ["Wedstrijd bevestigd", "Je bent definitief als scheidsrechter toegewezen."];
    case "assignment_cancelled":
      return ["Toewijzing gewijzigd", "Je scheidsrechterstoewijzing is geannuleerd."];
  }
}

function payloadFor(
  notificationType: NotificationType,
  routeType: "referee_offer" | "referee_assignment",
  resourceId: string
) {
  const [title, body] = genericAlert(notificationType);
  return {
    aps: {
      alert: { title, body },
      sound: "default",
      "thread-id": "referee-planning",
    },
    route_type: routeType,
    resource_id: resourceId,
  };
}

async function sendApns(args: {
  host: string;
  token: string;
  topic: string;
  authorization: string;
  payload: object;
}): Promise<ApnsResponse> {
  return await new Promise((resolve, reject) => {
    const client = connect(args.host);
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      client.close();
      callback();
    };
    client.once("error", (error) => finish(() => reject(error)));
    client.setTimeout(APNS_REQUEST_TIMEOUT_MS, () =>
      finish(() => reject(new Error("APNS_TIMEOUT")))
    );
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${args.token}`,
      authorization: `bearer ${args.authorization}`,
      "apns-topic": args.topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
    });
    let status = 0;
    let providerId: string | undefined;
    let responseBody = "";
    request.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
      const rawId = headers["apns-id"];
      providerId = Array.isArray(rawId) ? rawId[0] : rawId;
    });
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      responseBody += chunk;
    });
    request.on("end", () => {
      let reason: string | undefined;
      try {
        reason = responseBody
          ? (JSON.parse(responseBody) as { reason?: string }).reason
          : undefined;
      } catch {
        reason = "invalid_provider_response";
      }
      finish(() => resolve({ status, providerId, reason }));
    });
    request.once("error", (error) => finish(() => reject(error)));
    request.end(JSON.stringify(args.payload));
  });
}

function retryAt(attemptCount: number, status?: number) {
  if (attemptCount >= 3) return undefined;
  if (status !== undefined && status !== 429 && status < 500) return undefined;
  return Date.now() + Math.min(15 * 60_000, 30_000 * 2 ** (attemptCount - 1));
}

export const sendDelivery = internalAction({
  args: { deliveryId: v.id("mobilePushDeliveries") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const delivery = await ctx.runMutation(internal.mobilePush.claimDelivery, args);
    if (!delivery) return null;
    const keyId = process.env.APNS_KEY_ID;
    const teamId = process.env.APNS_TEAM_ID;
    const privateKey = process.env.APNS_PRIVATE_KEY;
    const topic = process.env.APNS_BUNDLE_ID;
    if (!keyId || !teamId || !privateKey || !topic) {
      await ctx.runMutation(internal.mobilePush.recordDeliveryResult, {
        deliveryId: delivery.deliveryId,
        deviceId: delivery.deviceId,
        success: false,
        providerReason: "APNS_NOT_CONFIGURED",
        disableDevice: false,
      });
      return null;
    }

    try {
      const response = await sendApns({
        host:
          delivery.environment === "production"
            ? "https://api.push.apple.com"
            : "https://api.sandbox.push.apple.com",
        token: delivery.apnsToken,
        topic,
        authorization: providerToken(keyId, teamId, privateKey),
        payload: payloadFor(
          delivery.notificationType,
          delivery.routeType,
          delivery.resourceId
        ),
      });
      const success = response.status === 200;
      const disableDevice =
        response.status === 410 ||
        ["BadDeviceToken", "DeviceTokenNotForTopic", "Unregistered"].includes(
          response.reason ?? ""
        );
      const nextRetryAt = success
        ? undefined
        : retryAt(delivery.attemptCount, response.status);
      const result = await ctx.runMutation(
        internal.mobilePush.recordDeliveryResult,
        {
          deliveryId: delivery.deliveryId,
          deviceId: delivery.deviceId,
          success,
          providerStatus: response.status,
          providerId: response.providerId,
          providerReason: response.reason,
          retryAt: nextRetryAt,
          disableDevice,
        }
      );
      if (result.shouldRetry && nextRetryAt !== undefined) {
        await ctx.scheduler.runAt(
          nextRetryAt,
          internal.mobilePushActions.sendDelivery,
          { deliveryId: delivery.deliveryId }
        );
      }
    } catch (error) {
      const nextRetryAt = retryAt(delivery.attemptCount);
      const result = await ctx.runMutation(
        internal.mobilePush.recordDeliveryResult,
        {
          deliveryId: delivery.deliveryId,
          deviceId: delivery.deviceId,
          success: false,
          providerReason:
            error instanceof Error ? error.message.slice(0, 200) : "APNS_NETWORK_ERROR",
          retryAt: nextRetryAt,
          disableDevice: false,
        }
      );
      if (result.shouldRetry && nextRetryAt !== undefined) {
        await ctx.scheduler.runAt(
          nextRetryAt,
          internal.mobilePushActions.sendDelivery,
          { deliveryId: delivery.deliveryId }
        );
      }
    }
    return null;
  },
});

export const testHelpers = { genericAlert, payloadFor, retryAt };
