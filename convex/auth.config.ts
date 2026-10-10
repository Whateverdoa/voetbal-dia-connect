import { AuthConfig } from "convex/server";

function decodePublishableKeyDomain(publishableKey: string) {
  const encodedDomain = publishableKey.split("_").slice(2).join("_");
  if (!encodedDomain) {
    throw new Error("Kon Clerk domein niet afleiden uit NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  }

  const normalized = encodedDomain.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = Buffer.from(padded, "base64").toString("utf8").replace(/\$/g, "");
  return decoded.startsWith("http") ? decoded : `https://${decoded}`;
}

function getClerkIssuerDomain() {
  const explicitDomain = process.env.CLERK_JWT_ISSUER_DOMAIN?.trim();
  if (explicitDomain) {
    return explicitDomain;
  }

  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  if (publishableKey) {
    return decodePublishableKeyDomain(publishableKey);
  }

  throw new Error(
    "Clerk issuer domein ontbreekt. Stel CLERK_JWT_ISSUER_DOMAIN in voor Convex auth."
  );
}

const issuer = getClerkIssuerDomain();

export default {
  providers: [
    {
      domain: issuer,
      applicationID: "convex",
    },
    // Default Clerk session tokens use the Frontend API URL as `aud`.
    {
      domain: issuer,
      applicationID: issuer,
    },
  ],
} satisfies AuthConfig;
