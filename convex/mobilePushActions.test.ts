// @vitest-environment node

import { describe, expect, it } from "vitest";
import { testHelpers } from "./mobilePushActions";

describe("APNs referee payload", () => {
  it("contains only generic alert text and opaque routing data", () => {
    const payload = testHelpers.payloadFor(
      "offer_sent",
      "referee_offer",
      "offer_opaque_123"
    );

    expect(payload).toEqual({
      aps: {
        alert: {
          title: "Nieuwe wedstrijdaanvraag",
          body: "Er staat een nieuw offer voor je klaar.",
        },
        sound: "default",
        "thread-id": "referee-planning",
      },
      route_type: "referee_offer",
      resource_id: "offer_opaque_123",
    });
    expect(JSON.stringify(payload)).not.toMatch(
      /opponent|teamName|player|venue|contact/i
    );
  });

  it("stops retrying after three attempts or a permanent provider response", () => {
    expect(testHelpers.retryAt(1, 500)).toBeTypeOf("number");
    expect(testHelpers.retryAt(3, 500)).toBeUndefined();
    expect(testHelpers.retryAt(1, 400)).toBeUndefined();
  });
});
