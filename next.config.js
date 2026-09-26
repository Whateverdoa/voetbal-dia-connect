// Allow dev assets for the one explicitly configured phone-testing origin.
const allowedDevOrigins = [];
if (process.env.TEAM_PORTAL_LAN_ORIGIN) {
  try { allowedDevOrigins.push(new URL(process.env.TEAM_PORTAL_LAN_ORIGIN).hostname); }
  catch { /* An invalid optional LAN origin does not prevent localhost use. */ }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins,
  outputFileTracingExcludes: {
    "/*": ["./.local/teamportaal/**/*"],
  },
};

module.exports = nextConfig;
