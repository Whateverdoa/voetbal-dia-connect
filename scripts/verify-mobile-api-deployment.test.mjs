import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeMobileApiBaseURL,
  verifyMobileApiDeployment,
} from "./verify-mobile-api-deployment.mjs";

function unauthenticatedResponse(overrides = {}) {
  const responseRequestId = overrides.requestId ?? "preflight_mobile_api";
  return new Response(
    JSON.stringify(
      overrides.body ?? {
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required",
          requestId: responseRequestId,
        },
      },
    ),
    {
      status: overrides.status ?? 401,
      headers: {
        "content-type": "application/json",
        "cache-control": overrides.cacheControl ?? "no-store",
        "x-request-id": responseRequestId,
      },
    },
  );
}

describe("deployed mobile API preflight", () => {
  it("accepts the documented unauthenticated contract without credentials", async () => {
    const requests = [];
    const result = await verifyMobileApiDeployment(
      { baseURL: "https://mobile.test/v1/mobile" },
      {
        fetch: async (...args) => {
          requests.push(args);
          return unauthenticatedResponse();
        },
      },
    );

    assert.deepEqual(result, {
      baseURL: "https://mobile.test/v1/mobile",
      status: 401,
    });
    assert.equal(requests[0][0], "https://mobile.test/v1/mobile/auth/session");
    assert.equal(requests[0][1].method, "POST");
    assert.equal(requests[0][1].redirect, "manual");
    assert.equal(
      requests[0][1].headers["x-request-id"],
      "preflight_mobile_api",
    );
    assert.equal("authorization" in requests[0][1].headers, false);
  });

  it("rejects local, placeholder, insecure, and malformed base URLs", () => {
    for (const baseURL of [
      "http://mobile.test/v1/mobile",
      "https://localhost/v1/mobile",
      "https://api.jeugdvoetbal.example/v1/mobile",
      "https://mobile.test/not-mobile",
      "https://mobile.test/v1/mobile?token=unsafe",
    ]) {
      assert.throws(() => normalizeMobileApiBaseURL(baseURL), /deployed HTTPS/);
    }
  });

  it("rejects redirects, successful responses, and contract drift", async () => {
    for (const response of [
      unauthenticatedResponse({ status: 200 }),
      unauthenticatedResponse({ status: 302 }),
      unauthenticatedResponse({ requestId: "different" }),
      unauthenticatedResponse({ cacheControl: "public, max-age=60" }),
      unauthenticatedResponse({ body: { error: { code: "OTHER" } } }),
    ]) {
      await assert.rejects(
        () =>
          verifyMobileApiDeployment(
            { baseURL: "https://mobile.test/v1/mobile" },
            { fetch: async () => response.clone() },
          ),
        /Mobile API preflight/,
      );
    }
  });

  it("reports network failures as preflight failures", async () => {
    await assert.rejects(
      () =>
        verifyMobileApiDeployment(
          { baseURL: "https://mobile.test/v1/mobile" },
          {
            fetch: async () => {
              throw new Error("certificate rejected");
            },
          },
        ),
      /Mobile API preflight request failed: certificate rejected/,
    );
  });
});
