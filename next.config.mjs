const r2Hostname = process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : undefined;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    root: process.cwd()
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(r2Hostname ? [{ protocol: "https", hostname: r2Hostname }] : [])
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ]
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" }
        ]
      }
    ];
  }
};

export default nextConfig;
