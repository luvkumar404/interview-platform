import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Runtime room data and local browser profiles are not deployable source assets.
  outputFileTracingExcludes: { "/*": ["./.data/**/*"] },
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
