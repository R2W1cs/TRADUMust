/** @type {import('next').NextConfig} */
const apiProxyOrigin = process.env.NEXT_PUBLIC_API_PROXY_TARGET || "http://127.0.0.1:8001";

const nextConfig = {
  // In development the frontend proxies relative /api requests to the PHP service.
  // In production the PHP backend should be served directly at /api by the web server.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }

    return [
      {
        source: "/api/ml/:path*",
        destination: "http://127.0.0.1:8001/api/ml/:path*",
      },
      {
        source: "/api/sign/:path*",
        destination: "http://127.0.0.1:8001/api/sign/:path*",
      },
      {
        source: "/api/:path*",
        destination: `${apiProxyOrigin}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
