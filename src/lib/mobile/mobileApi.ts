import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type ErrorDetails = Record<string, string | number | boolean | null>;

const ERROR_STATUS: Record<string, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  INVALID_TRANSITION: 409,
  OFFER_EXPIRED: 409,
  OFFER_ALREADY_RESPONDED: 409,
  REFEREE_CONFLICT: 409,
  REFEREE_NOT_ELIGIBLE: 409,
  ASSIGNMENT_ALREADY_CONFIRMED: 409,
  MATCH_CANCELLED: 409,
  VALIDATION_ERROR: 400,
  RATE_LIMITED: 429,
  TEMPORARILY_UNAVAILABLE: 503,
};

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHENTICATED: "Authentication is required",
  FORBIDDEN: "You do not have access to this resource",
  NOT_FOUND: "The requested resource was not found",
  VERSION_CONFLICT: "The resource changed; refresh and try again",
  INVALID_TRANSITION: "This action is not valid for the current state",
  OFFER_EXPIRED: "This offer is no longer available",
  OFFER_ALREADY_RESPONDED: "This offer already has a response",
  REFEREE_CONFLICT: "The referee has a scheduling conflict",
  REFEREE_NOT_ELIGIBLE: "The referee is not eligible for this match",
  ASSIGNMENT_ALREADY_CONFIRMED: "A referee is already confirmed",
  MATCH_CANCELLED: "The match is cancelled",
  VALIDATION_ERROR: "The request payload is invalid",
  RATE_LIMITED: "Too many requests",
  TEMPORARILY_UNAVAILABLE: "The service is temporarily unavailable",
};

const KNOWN_ERROR_CODES = Object.keys(ERROR_STATUS).sort(
  (left, right) => right.length - left.length
);

export class MobileApiError extends Error {
  constructor(
    readonly code: string,
    message = ERROR_MESSAGES[code] ?? "The request failed",
    readonly details?: ErrorDetails
  ) {
    super(message);
  }
}

export type MobileRequestContext = {
  convex: ConvexHttpClient;
  requestId: string;
};

function requestIdFor(request: NextRequest) {
  const supplied = request.headers.get("x-request-id")?.trim();
  if (supplied && /^[A-Za-z0-9._:-]{1,100}$/.test(supplied)) return supplied;
  return `req_${crypto.randomUUID()}`;
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new MobileApiError("UNAUTHENTICATED");
  return match[1];
}

function createConvexClient(request: NextRequest) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl) {
    throw new MobileApiError("TEMPORARILY_UNAVAILABLE");
  }
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(bearerToken(request));
  return client;
}

function errorCode(error: unknown) {
  if (error instanceof MobileApiError) return error.code;
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("ACCOUNT_NOT_SYNCHRONIZED")) return "UNAUTHENTICATED";
  if (message.includes("ArgumentValidationError")) return "VALIDATION_ERROR";
  return (
    KNOWN_ERROR_CODES.find((code) => message.includes(code)) ??
    "TEMPORARILY_UNAVAILABLE"
  );
}

export function mobileJson(
  data: unknown,
  requestId: string,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-request-id": requestId,
    },
  });
}

function mobileErrorResponse(error: unknown, requestId: string) {
  const code = errorCode(error);
  const knownError = error instanceof MobileApiError ? error : null;
  return mobileJson(
    {
      error: {
        code,
        message: knownError?.message ?? ERROR_MESSAGES[code],
        requestId,
        ...(knownError?.details ? { details: knownError.details } : {}),
      },
    },
    requestId,
    ERROR_STATUS[code] ?? 500
  );
}

export async function withMobileRequest(
  request: NextRequest,
  handler: (context: MobileRequestContext) => Promise<unknown>
) {
  const requestId = requestIdFor(request);
  try {
    const context = { convex: createConvexClient(request), requestId };
    const data = await handler(context);
    return mobileJson(data, requestId);
  } catch (error) {
    return mobileErrorResponse(error, requestId);
  }
}

export async function resolveRefereeClubId(
  request: NextRequest,
  convex: ConvexHttpClient
): Promise<Id<"clubs">> {
  const memberships = await convex.query(
    api.clubIdentity.getMyClubMemberships,
    {}
  );
  const requestedClubId =
    request.headers.get("x-club-id")?.trim() ||
    request.nextUrl.searchParams.get("clubId")?.trim();
  const eligible = memberships.filter(
    (membership) =>
      membership.status === "active" && membership.roles.includes("referee")
  );
  const selected = requestedClubId
    ? eligible.find((membership) => String(membership.clubId) === requestedClubId)
    : eligible[0];
  if (!selected) {
    throw new MobileApiError(
      requestedClubId ? "FORBIDDEN" : "VALIDATION_ERROR",
      requestedClubId
        ? "No referee membership exists for this club"
        : "No active referee workspace is available"
    );
  }
  return selected.clubId;
}

export async function readJsonObject(request: NextRequest) {
  try {
    const value: unknown = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new MobileApiError("VALIDATION_ERROR");
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof MobileApiError) throw error;
    throw new MobileApiError("VALIDATION_ERROR");
  }
}

export function requiredVersion(body: Record<string, unknown>) {
  if (
    typeof body.version !== "number" ||
    !Number.isInteger(body.version) ||
    body.version < 1
  ) {
    throw new MobileApiError("VALIDATION_ERROR", "version must be a positive integer");
  }
  return body.version;
}

export function requiredCorrelationId(body: Record<string, unknown>) {
  if (
    typeof body.correlationId !== "string" ||
    !body.correlationId.trim()
  ) {
    throw new MobileApiError("VALIDATION_ERROR", "correlationId is required");
  }
  const normalized = body.correlationId.trim();
  if (normalized.length > 100) {
    throw new MobileApiError(
      "VALIDATION_ERROR",
      "correlationId must be at most 100 characters"
    );
  }
  return normalized;
}

export function optionalString(
  body: Record<string, unknown>,
  key: string,
  maxLength = 1_000
) {
  const value = body[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new MobileApiError("VALIDATION_ERROR", `${key} must be a string`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new MobileApiError(
      "VALIDATION_ERROR",
      `${key} must be at most ${maxLength} characters`
    );
  }
  return normalized || undefined;
}

export const testHelpers = { errorCode };
