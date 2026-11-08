import type { NextConfig } from "next";

const connectSources = ["'self'"];
const scriptSources = ["'self'", "'unsafe-inline'"];
if (process.env.NEXT_PUBLIC_API_URL) {
  connectSources.push(new URL(process.env.NEXT_PUBLIC_API_URL).origin);
}
connectSources.push(
  "https://basemaps.cartocdn.com",
  "https://tiles.basemaps.cartocdn.com",
);
if (process.env.NODE_ENV === "development") {
  scriptSources.push("'unsafe-eval'");
}

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src ${scriptSources.join(" ")}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com",
              "font-src 'self' data:",
              `connect-src ${connectSources.join(" ")}`,
              "worker-src 'self' blob:",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
