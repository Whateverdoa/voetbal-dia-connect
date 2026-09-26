/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingExcludes: {
    "/*": ["./.local/teamportaal/**/*"],
  },
};

module.exports = nextConfig;
