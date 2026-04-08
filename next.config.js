/** @type {import('next').NextConfig} */
const apiProxyOrigin = process.env.NEXT_PUBLIC_API_PROXY_TARGET || "http://127.0.0.1:8000";

const nextConfig = {
  // In development the frontend proxies relative /api requests to the PHP service.
  // In production the PHP backend should be served directly at /api by the web server.
  async rewrites() {
    if (process.env.NODE_ENV !== "development") {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyOrigin}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
