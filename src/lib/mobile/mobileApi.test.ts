import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import {
  MobileApiError,
  requiredCorrelationId,
  requiredVersion,
  optionalString,
  testHelpers,
  withMobileRequest,
} from "./mobileApi";

const originalConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

afterEach(() => {
  if (originalConvexUrl === undefined) {
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
  } else {
    process.env.NEXT_PUBLIC_CONVEX_URL = originalConvexUrl;
  }
});

describe("mobile API envelope", () => {
  it("rejects requests without a bearer token", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://mobile-test.convex.cloud";
    const response = await withMobileRequest(
      new NextRequest("https://example.test/v1/mobile/referee/home"),
      async () => ({ ok: true })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "UNAUTHENTICATED",
        message: "Authentication is required",
      },
    });
    expect(response.headers.get("x-request-id")).toMatch(/^req_/);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("preserves a valid request id and maps stable domain errors", async () => {
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://mobile-test.convex.cloud";
    const response = await withMobileRequest(
      new NextRequest("https://example.test/v1/mobile/referee/home", {
        headers: {
          authorization: "Bearer clerk-session-token",
          "x-request-id": "req_client_123",
        },
      }),
      async () => {
        throw new MobileApiError("VERSION_CONFLICT");
      }
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("x-request-id")).toBe("req_client_123");
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "VERSION_CONFLICT",
        message: "The resource changed; refresh and try again",
        requestId: "req_client_123",
      },
    });
  });

  it("validates resource versions and correlation ids", () => {
    expect(requiredVersion({ version: 3 })).toBe(3);
    expect(requiredCorrelationId({ correlationId: " action-123 " })).toBe(
      "action-123"
    );
    expect(requiredCorrelationId({ correlation_id: " ios-action-123 " })).toBe(
      "ios-action-123"
    );
    expect(() => requiredVersion({ version: 0 })).toThrow("version must be");
    expect(() => requiredCorrelationId({})).toThrow("correlationId is required");
    expect(() =>
      requiredCorrelationId({ correlationId: "x".repeat(101) })
    ).toThrow("at most 100");
    expect(optionalString({ note: " akkoord " }, "note")).toBe("akkoord");
    expect(optionalString({ reason_code: " unavailable " }, "reasonCode")).toBe(
      "unavailable"
    );
    expect(() => optionalString({ note: "x".repeat(1_001) }, "note")).toThrow(
      "at most 1000"
    );
  });

  it("normalizes Convex errors without exposing their raw message", () => {
    expect(
      testHelpers.errorCode(
        new Error("[CONVEX] Uncaught Error: OFFER_ALREADY_RESPONDED")
      )
    ).toBe("OFFER_ALREADY_RESPONDED");
    expect(testHelpers.errorCode(new Error("database internals"))).toBe(
      "TEMPORARILY_UNAVAILABLE"
    );
    expect(
      testHelpers.errorCode(new Error("ArgumentValidationError: invalid id"))
    ).toBe("VALIDATION_ERROR");
  });
});
