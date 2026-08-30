import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const requestId = "preflight_mobile_api";

export function normalizeMobileApiBaseURL(rawURL) {
  const value = rawURL?.trim();
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("JEUGDVOETBAL_API_BASE_URL must be a valid HTTPS URL");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/v1/mobile" ||
    url.search ||
    url.hash ||
    url.hostname.endsWith(".example") ||
    url.hostname === "localhost"
  ) {
    throw new Error(
      "JEUGDVOETBAL_API_BASE_URL must be a deployed HTTPS /v1/mobile URL",
    );
  }
  return url.toString().replace(/\/$/, "");
}

export async function verifyMobileApiDeployment(
  { baseURL = process.env.JEUGDVOETBAL_API_BASE_URL, timeoutMs = 10_000 } = {},
  dependencies = {},
) {
  const normalizedBaseURL = normalizeMobileApiBaseURL(baseURL);
  const request = dependencies.fetch ?? fetch;
  const endpoint = `${normalizedBaseURL}/auth/session`;
  let response;
  try {
    response = await request(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "x-request-id": requestId,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Mobile API preflight request failed: ${reason}`);
  }

  if (response.status !== 401) {
    throw new Error(
      `Mobile API preflight expected HTTP 401 but received ${response.status}`,
    );
  }
  if (response.headers.get("x-request-id") !== requestId) {
    throw new Error(
      "Mobile API preflight did not echo the expected x-request-id",
    );
  }
  if (
    !response.headers
      .get("cache-control")
      ?.toLowerCase()
      .split(",")
      .map((value) => value.trim())
      .includes("no-store")
  ) {
    throw new Error(
      "Mobile API preflight response must use cache-control: no-store",
    );
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("Mobile API preflight response must be JSON");
  }
  if (
    body?.error?.code !== "UNAUTHENTICATED" ||
    body?.error?.requestId !== requestId
  ) {
    throw new Error(
      "Mobile API preflight returned an unexpected error envelope",
    );
  }

  return { baseURL: normalizedBaseURL, status: response.status };
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  try {
    const verified = await verifyMobileApiDeployment();
    console.log(
      `Verified deployed mobile API contract at ${verified.baseURL} (HTTP ${verified.status}).`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
